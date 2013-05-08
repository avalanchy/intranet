import datetime
import json
from calendar import timegm

from sqlalchemy import func
from sqlalchemy.sql import or_, and_

from intranet3.models import User, TimeEntry
from intranet3 import helpers as h


class BugUglyAdapter(object):
    """
    Temporary hack
    """

    def __init__(self, bug):
        self._bug = bug

    def __getattr__(self, item):
        return getattr(self._bug, item)

    def is_closed(self):
        if self._bug.project.client_id == 20:
            return self._bug.get_status() == 'VERIFIED' and self._bug.get_resolution() == 'DEPLOYED'
        else:
            return self._bug.get_status() == 'CLOSED' or self._bug.get_status() == 'VERIFIED'

    @property
    def points(self):
        return float(self.whiteboard.get('p', 0.0))

    @property
    def velocity(self):
        points = float(self.whiteboard.get('p', 0.0))
        return (points / self.sprint_time) if self.sprint_time else 0.0


def parse_whiteboard(wb):
    wb = wb.strip().replace('[', ' ').replace(']', ' ')
    if wb:
        return dict(i.split('=', 1) for i in wb.split() if '=' in i)
    return {}


def move_blocked_to_the_end(bugs):
    """Move blocked bugs to the end of the list"""
    blocked_bugs = [bug for bug in bugs if bug.is_blocked]
    bugs = [bug for bug in bugs if not bug.is_blocked]
    bugs.extend(blocked_bugs)
    return bugs


class SprintWrapper(object):
    def __init__(self, sprint, bugs, request):
        self.sprint = sprint
        self.bugs = [BugUglyAdapter(bug) for bug in bugs if bug.project_id]
        self.request = request
        self.session = request.db_session

    def _date_to_js(self, date):
        """Return unix epoc timestamp in miliseconds (in UTC)"""
        return timegm(date.timetuple()) * 1000

    def _get_burndown(self):
        """Return a list of total point values per day of sprint"""
        today = datetime.date.today()
        sdate = self.sprint.start
        edate = self.sprint.end if self.sprint.end < today else today
        if sdate > today:
            return []
        tseries = dict([(cdate, 0) for cdate in h.dates_between(sdate, edate) ])

        for bug in self.bugs:
            if bug.is_closed() or bug.get_status() == 'RESOLVED':
                for date in tseries.iterkeys():
                    if date < bug.changeddate.date():
                        tseries[date] += bug.points
            else:
                for date in tseries.iterkeys():
                    tseries[date] += bug.points

        tseries = [ (self._date_to_js(v[0]), v[1]) for v in sorted(tseries.iteritems(), key=lambda x: x[0]) ]
        return tseries

    def _get_burndown_axis(self):
        """Return a list of epoch dates between sprint start and end
        inclusive"""
        return [self._date_to_js(cdate) for cdate in
                h.dates_between(self.sprint.start, self.sprint.end)]

    def get_burndown_data(self):
        return dict(
            burndown=self._get_burndown(),
            burndown_axis=self._get_burndown_axis(),
            total_points=self.get_points(),
        )

    def get_points_achieved(self):
        points = sum([ bug.points for bug in self.bugs if bug.is_closed()])
        return points

    def get_points(self):
        points = sum([ bug.points for bug in self.bugs ])
        return points

    def get_worked_hours(self):
        bugs_ids = [(int(bug.project_id), bug.id) for bug in self.bugs]
        if not self.bugs:
            return [], 0
        bug_ids_cond = or_(*[ and_(TimeEntry.project_id==p_id, TimeEntry.ticket_id==b_id)  for p_id, b_id in bugs_ids ])

        entries = self.session.query(User, func.sum(TimeEntry.time))\
                              .filter(TimeEntry.user_id==User.id)\
                              .filter(bug_ids_cond)\
                              .filter(TimeEntry.added_ts>=self.sprint.start)\
                              .filter(TimeEntry.added_ts<=self.sprint.end)\
                              .filter(TimeEntry.deleted==False)\
                              .group_by(User).all()

        entries = sorted([ (user.name, round(time)) for user, time in entries ], key=lambda x: x[1], reverse=True)
        return entries, sum([e[1] for e in entries])

    def get_board(self):
        todo = dict(bugs=[], points=0)
        inprocess = dict(bugs=[], points=0)
        toverify = dict(bugs=[], points=0)
        completed = dict(bugs=[], points=0)

        for bug in self.bugs:
            points = bug.points
            if bug.is_closed():
                completed['bugs'].append(bug)
                completed['points'] += points
            elif bug.get_status() == 'RESOLVED':
                toverify['bugs'].append(bug)
                toverify['points'] += points
            elif not bug.is_unassigned():
                inprocess['bugs'].append(bug)
                inprocess['points'] += points
            else:
                todo['bugs'].append(bug)
                todo['points'] += points

        for col in todo, inprocess, toverify, completed:
            col['bugs'] = move_blocked_to_the_end(
                sorted(col['bugs'], cmp=h.sorting_by_priority)
            )
        return dict(
            bugs=self.bugs,
            todo=todo,
            inprocess=inprocess,
            toverify=toverify,
            completed=completed,
        )

    def get_info(self):
        entries, sum_worked_hours = self.get_worked_hours()
        points_achieved = self.get_points_achieved()
        points = self.get_points()
        total_hours = sum_worked_hours

        result = dict(
            start=self.sprint.start.strftime('%Y-%m-%d'),
            end=self.sprint.end.strftime('%Y-%m-%d'),
            days_remaining=h.get_working_days(datetime.date.today(), self.sprint.end),
            total_bugs = len(self.bugs),
        )
        self.sprint.commited_points = points
        self.sprint.achieved_points = points_achieved
        self.sprint.worked_hours = total_hours
        return result


def get_velocity_chart_data(sprints):
    velocity_chart = [
        (s.name,
         s.commited_points,
         s.achieved_points) for s in sprints
    ]

    if velocity_chart:
        velocity_chart.insert(0, (u'Sprint name', u'Commited', u'Completed'))
        return json.dumps(velocity_chart)
    else:
        return None

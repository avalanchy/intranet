function generateTable(data) {
    var $absences = $('.absences');
    // Inform user that something is happening.
    $absences.text('Preparing data, please wait...');

    // For starters, prepare HTML structure. If it's generated by JS, it should
    // be 100% generated.
    var $struct = $([
        '<div class="absences">',
            '<div class="floaty placeholder"></div>',
            '<div class="floaty topHeader days">',
                '<table class="display" id="days">',
                    '<thead></thead>',
                '</table>',
            '</div>',
            '<div class="floaty leftHeader users">',
                '<table class="display" id="users">',
                    '<tbody></tbody>',
                '</table>',
            '</div>',
            '<div class="floaty data">',
                '<div class="scrollable">',
                    '<table class="display" id="data">',
                        '<tbody></tbody>',
                    '</table>',
                '</div>',
            '</div>',
        '</div>'
    ].join('\n'));

    // All necessary variables
    var today = new Date(),
        todayString = $.datepicker.formatDate('yy-mm-dd', today),
        dayLetters = ['M', 'T', 'W', 'M', 'F', 'S', 'S'],
        startDay = data.startDay.day,
        dayOfWeek = data.startDay.dow,
        rows = [];

    // Selectors
    var $days = $struct.find('#days thead'),
        $users = $struct.find('#users tbody'),
        $data = $struct.find('#data tbody'),
        $placeholder = $struct.find('.placeholder');
        singleRowStub = $('<tr />'),

    // Placeholder!
    $placeholder.html('<div>Total: <span class="help" title="leave days used / leave days mandated">'+data.absencesSum[0]+'/'+data.absencesSum[1]+'</span></div>');

    // Generate all headers!
    // Header 1: month's name (July)
    var header1 = $('<tr />');
    // Header 2: month's days (1, 2, 3...)
    var header2 = $('<tr />');
    // Header 3: week days (M, T, W...)
    var header3 = $('<tr />');
    var first = true;
    _.each(data.months, function(m){
        var firstMonth = (data.months.indexOf(m) == 0);
        // Month header
        // Month name is spanning through all days
        var colspan = firstMonth ? m[1]-startDay+1 : m[1];
        var monthNo = m[2]<10 ? '0'+m[2] : m[2];
        var link = '/employees/list/absence?limit=200&date_start=01-'+monthNo+'-'+data.year+'&date_end='+m[1]+'-'+monthNo+'-'+data.year;
        var monthText = m[0] + ' (<a href="'+link+'" class="help" title="leave days count (excluding illness leaves)">'+data.absencesMonths[m[2]]+'</a>)';
        var headTd = $('<th/>').html(monthText).attr('colspan', colspan).addClass('month');
        if(data.year === today.getFullYear() && m[2] === today.getMonth()+1) {
            headTd.addClass('current');
        }
        header1.append(headTd);
        var iTemp = firstMonth ? startDay : 1;
        for(var i=iTemp; i<=m[1]; i++) {
            // Day ID, e.g. 2013-06-10
            var dayId = data.year + '-' + monthNo + '-' + (i<10 ? '0' : '') + i
            // Day number
            var head2Td = $('<th class="day">'+i+'</th>');
            // Week day letter
            var head3Td = $('<th class="day">'+dayLetters[(dayOfWeek%7)]+'</th>');
            var td;
            // Workaround to make all cells have the same height
            if(first) {
                td = $('<td class="'+dayId+'">&nbsp;</td>');
                first = false;
            } else {
                td = $('<td />');
            }
            td.addClass(dayId);
            // Special classes
            if(i == m[1]) { // End of the month
                head2Td.addClass('monthend');
                head3Td.addClass('monthend');
                td.addClass('monthend');
            }
            if(dayOfWeek%7 >= 5 || data.holidays.indexOf(dayId) != -1) { // Saturday, Sunday or Holiday
                head2Td.addClass('holiday');
                head3Td.addClass('holiday');
                td.addClass('holiday');
            }
            if(dayId === todayString) { // Today
                head2Td.addClass('today');
                head3Td.addClass('today');
                td.addClass('today');
            }
            header2.append(head2Td);
            header3.append(head3Td);
            singleRowStub.append(td);
            dayOfWeek++;
        }
    });

    // Generate all users!
    var users = '';
    // cg = currentGroup
    var cgNo = 0,
        cgUser = 0,
        cg = data.userGroups[0];
    _.each(data.users, function(u){
        if(cgUser >= cg[1]) {
            cgNo++;
            cg = data.userGroups[cgNo];
            cgUser = 0;
        }
        var row = singleRowStub.clone();
        row.attr('id', 'u'+u.id);
        var leaves = '<span class="help" title="leave days used / leave days mandated">('+u.leave_used+'/'+u.leave_mandated+')</span>';
        var groupHeader = cgUser == 0 ? '<td class="city-vertical" rowspan="'+cg[1]+'"><span>'+cg[0]+'</span></td>' : '';
        var link = '/employees/list/absence?user_id='+u.id+'&limit=200&date_start=01-01-'+data.year+'&date_end=31-12-'+data.year;
        users += '<tr id="u'+u.id+'">'+groupHeader+'<td class="user"><a href="'+link+'">'+u.name+' '+leaves+'</a></td></tr>';
        if(u.id in data.absences) { // Absences
            for(start in data.absences[u.id]) {
                var attr = data.absences[u.id][start];
                // attr: [length, type, description]
                // Failsafety for wrong entries
                if(attr[0] <= 0) {
                    attr[0] = 1;
                }
                var $td = row.find('.'+start);
                if (attr[0] > 1) {
                    var $tdNext = $td.nextAll(':lt('+(attr[0]-1)+')');
                    if($tdNext.length) {
                        $td = $td.add($tdNext);
                    }
                }
                $td.addClass('absent').attr({
                    title: attr[2]
                });
                var date = new Date(Date.parse(start)),
                    dateString = '';
                for(var i=0; i<attr[0]; i++) {
                    dateString = $.datepicker.formatDate('dd.mm.yy', date);
                    var link = '<a href="/times/list_user?date='+dateString+'&user_id='+u.id+'">Hours</a>';
                    date.setDate(date.getDate()+1); // Add 1 day - obvious, isn't it?
                    $td.eq(i).html(link);
                }
                $td.last().addClass('last');
            }
        }
        if(u.id in data.lates) { // Latenesses
            for(when in data.lates[u.id]) {
                var why = data.lates[u.id][when];
                row.find('.'+when).addClass('late inactive').attr('title', why);
            }
        }
        rows.push(row);
        cgUser++;
    });

    // Append!
    $days.append(header1);
    $days.append(header2);
    $days.append(header3);
    $users.append(users);
    $data.append(rows);

    // Wrap all today cells
    $data.find('.today').prev().addClass('today');

    $absences.replaceWith($struct);
}

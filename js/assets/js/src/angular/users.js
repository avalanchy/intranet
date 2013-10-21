var App = angular.module('intranet');

App.controller('usersCtrl', function($scope, $http, $dialog, $timeout, $filter, date_of_birth) {

    $scope.users = [];
    $scope.tab = 'employees';
    $scope.search = {
      name: '',
      start_work: {
      },
      stop_work: {
      },
      locations: [],
      roles: [],
      groups: [],
      teams: []
    };

    $scope.locations = [
        {
            id:'poznan',
            name:'Poznań'
        },
        {
            id:'wroclaw',
            name:'Wrocław'
        }
    ];
    $scope.set_tab = function(name){
       $scope.tab = name;
    };

    $scope.roles = $filter('orderBy')(_.map($scope.G.ROLES, function(role){
      return {id: role[0], name: role[1]};
    }), 'name');

    $scope.groups = $filter('orderBy')(_.map($scope.G.GROUPS, function(group){
      return {id: group, name: group};
    }), 'name');

    $scope.to_pretty_role = function(role){
      return _.find(G.ROLES, function(a_role){
        return a_role[0] === role;
      })[1];
    };

    $scope.dob = date_of_birth.create(1980, 1995);

    $http.get('/api/users?full=1&inactive=1').success(function(data){
      $scope.users = data.users;
      $http.get('/api/teams').success(function(data){
        $scope.teams = $filter('orderBy')(data.teams, 'name');
        $scope.teams_to_user = {};
        $scope.user_to_teams = {};
        _.each(data, function(team){
          $scope.teams_to_user[team['id']] = team['users'];
        });

        _.each($scope.users, function(user){
          user.teams = [];
          user.teams_ids = [];
          _.each($scope.teams, function(team){
            if(team.users.indexOf(user.id) >= 0){
             user.teams.push(team);
             user.teams_ids.push(team.id);
            }
          });
        });

        $scope.search.teams = [1]; //szczuczka aby wymusić odświeżenie -- spowodowane kiepska implementacja dyrektywy bs-select
        $timeout(function(){
          $scope.search.teams = [];
        }, 0);
      });
        $scope.dob.update_years($scope.users);
    });


    $scope.filtered_users = function(){
      var filtered_users = $scope.users;

      var f_name = $scope.search.name.toLowerCase();
      if(f_name){
        filtered_users = _.filter(filtered_users, function(user){
          var u_name = user.name.toLowerCase();
          return u_name.indexOf(f_name) >= 0;
        });
      }

      var f_roles = $scope.search.roles;
      if(f_roles.length > 0){
        filtered_users = _.filter(filtered_users, function(user){
          var u_roles = user.roles;
          var intersection = _.intersection(f_roles, u_roles);
          return intersection.length > 0;
        });
      }

      var f_groups = $scope.search.groups;
      if(f_groups.length > 0){
        filtered_users = _.filter(filtered_users, function(user){
          var u_groups = user.groups;
          var intersection = _.intersection(f_groups, u_groups);
          return intersection.length > 0;
        });
      }

      var f_locations = $scope.search.locations;
      if(f_locations.length > 0){
        filtered_users = _.filter(filtered_users, function(user){
          var u_location = user.location[0];
          return _.indexOf(f_locations, u_location) >= 0;
        });
      }

      var f_teams = $scope.search.teams;
      if(f_teams.length > 0){
        filtered_users = _.filter(filtered_users, function(user){
          var u_teams = user.teams_ids;
          var intersection = _.intersection(f_teams, u_teams);
          return f_teams.length === intersection.length;
        });
      }

      var start = $scope.search.start_work.start;
      var end = $scope.search.start_work.end;
      if(start && end){
        filtered_users = _.filter(filtered_users, function(user){
          var u_start_work = Date.parse(user.start_work);
          return !u_start_work || (start <= u_start_work  && u_start_work <= end);
        });
      }

      start = $scope.search.stop_work.start;
      end = $scope.search.stop_work.end;
      if(start && end){
        filtered_users = _.filter(filtered_users, function(user){
          var u_stop_work = Date.parse(user.stop_work);
          return !u_stop_work || (start <= u_stop_work  && u_stop_work <= end);
        });
      }

        var d_start = $scope.dob.start;
        var d_end = $scope.dob.end;
        if( d_start && d_end ){
            filtered_users = _.filter(filtered_users, function(user){
                var dob = user.date_of_birth;
                if (dob){
                    var year = dob.substring(0,4);
                    dob = (year >= d_start) && (year <= d_end);
                }
                return dob;
            });
        }

      return filtered_users;
    };

    $scope.get_employees = function(){
      return _.filter($scope.filtered_users(), function(user){
        var not_client = _.indexOf(user.groups, 'client') === -1;
        var not_freelancer = !user.freelancer;
        return user.is_active && not_client && not_freelancer;
      });
    };
    $scope.get_freelancers = function(){
      return _.filter($scope.filtered_users(), function(user){
        return user.is_active && user.freelancer;
      });
    };
    $scope.get_clients = function(){
      return _.filter($scope.filtered_users(), function(user){
        var client = _.indexOf(user.groups, 'client') >= 0;
        return client;
      });
    };
    $scope.get_inactive = function(){
      return _.filter($scope.filtered_users(), function(user){
        var not_client = _.indexOf(user.groups, 'client') === -1;
        return !user.is_active && not_client;
      });
    };

    $scope.get_users = function(){
      if($scope.tab === 'employees'){
        return $scope.get_employees();
      } else if ($scope.tab === 'freelancers'){
        return $scope.get_freelancers();
      } else if ($scope.tab === 'clients'){
        return $scope.get_clients();
      } else if ($scope.tab === 'inactive'){
        return $scope.get_inactive();
      }
    };
});

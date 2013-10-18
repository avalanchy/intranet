angular.module('intranet')
    .service('date_of_birth', function(){

        return {
            self: null,
            START: null,
            END: null,
            first: null,
            second: null,
            penult: null,
            last: null,

            create: function(START, END){
                this.START = START;
                this.END = END;
                this.first = 0;
                this.second = 1;
                this.penult = END-START+3;
                this.last = END-START+4;

                var cls = function(){

                    this.start = null;
                    this.end = null;
                    this.first = 0;
                    this.second = 1;
                    this.penult = END-START+3;
                    this.last = END-START+4;
                    this.chosen = 'Date of birth';

                    this.years = ['Date of birth'].concat(
                        ['Before ' + START],
                        _.range(START, END+1),
                        ['After '+ END],
                        ['Custom']
                    );

                    this.set_range = function(start, end){
                        this.start = start;
                        this.end = end;
                    };

                    this.select_year = function(){

                        var chosen = this.years.indexOf(this.chosen);
                        debugger;
                        switch (chosen){
                            case this.first:
                                this.set_range(null, null);
                                break;
                            case this.second:
                                this.set_range(START-50, START-1);
                                break;
                            case this.penult:
                                this.set_range(END+1, 2100);
                                break;
                            case this.last:
                                this.set_range(START, END);
                                break;
                            default:

                                var y = START + chosen - 2;
                                this.set_range(y, y);
                        }
                    };
                 };
                 this.self = new cls();
                 return this.self;
            },
            update_years_occurrences: function(users){
                var self = this.self;

                var years = _.map(users, function(user){
                    if (user.date_of_birth)
                        return user.date_of_birth.substring(0,4);
                    else
                        return null;
                });
                years = _.compact(years);

                var counts = {};
                for(var i = 0; i< years.length; i++) {
                    var num = years[i];
                    counts[num] = counts[num] ? counts[num]+1 : 1;
                }
                // special cases for START > years > END
                var before_start = 0;
                var after_end = 0;
                for (var i=1; i<100; i++){
                    before_start += counts[this.START-i] || 0;
                    after_end += counts[this.END+i] || 0;
                }
                if (before_start)
                    self.years[this.second] += ' (' + before_start + ')';
                if (after_end)
                    self.years[this.penult] += ' (' + after_end + ')';

                // the middle years
                for (var i=this.second+1; i<this.penult; i++){
                    var n = counts[self.years[i]];
                    if (self.years[i]==1988) debugger;
                    if (n)
                        self.years[i] += ' ('+ n + ')';
                }
            }
        };
    }
);
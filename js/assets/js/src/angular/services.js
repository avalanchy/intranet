angular.module('intranet')
    .service('services', function(){
        return {

            date_of_birth: function(START, END){
                 var first = 'Date of birth';
                 var second = 'Before ' + START;
                 var penult = 'After '+ END;
                 var last = 'Custom';

                 var cls = function(){
                     this.years = [first].concat([second], _.range(START, END+1), [penult], [last]);
                     this.chosen = first;
                     this.last = last;
                     this.start = null;
                     this.end = null;
                     this.set_range = function(start, end){
                         this.start = start;
                         this.end = end;
                     };
                     this.select_year = function(){
                         switch (this.chosen){
                             case first:
                                 this.set_range(null, null);
                                 break;
                             case second:
                                 this.set_range(START-50, START-1);
                                 break;
                             case penult:
                                 this.set_range(END+1, 2100);
                                 break;
                             case last:
                                 this.set_range(START, END);
                                 break;
                             default:
                                 this.set_range(this.chosen, this.chosen);
                         }
                     };
                 };
                 return new cls();
            }

        };
    }
);
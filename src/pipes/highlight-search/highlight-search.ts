import { Pipe, PipeTransform } from '@angular/core';

/**
 * Generated class for the HighlightSearchPipe pipe.
 *
 * See https://angular.io/api/core/Pipe for more info on Angular Pipes.
 */
@Pipe({
  name: 'highlightSearch',
})
export class HighlightSearchPipe implements PipeTransform {
  /**
   * Takes in the search input and the results and highlights the portion
   * of the result string that matches the search query.
   */

  transform(value: string, args: string): any {
    if (args && value) {
      let startIndex = value.toLowerCase().indexOf(args.toLowerCase());
      if (startIndex != -1) {
        let endLength = args.length;
        let matchingString = value.substr(startIndex, endLength);
        return value.replace(matchingString, "\<span class='bold'\>" + matchingString + "\</span\>");
      }

    }
    return value;
  }
}

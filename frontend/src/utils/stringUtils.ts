/**
 * String prototype extensions for capitalization
 */

// Extend the String interface for TypeScript
declare global {
    interface String {
      /**
       * Capitalizes the first letter of the string
       * @returns The string with the first letter capitalized
       * @example "hello world".toCapitalize() => "Hello world"
       */
      toCapitalize(): string;
  
      /**
       * Capitalizes the first letter of each word in the string
       * @returns The string with each word's first letter capitalized
       * @example "hello world".toCapitalizeWords() => "Hello World"
       */
      toCapitalizeWords(): string;
    }
  }
  
  // Implement the toCapitalize method on String prototype
  String.prototype.toCapitalize = function(): string {
    if (!this.length) return '';
    return this.charAt(0).toUpperCase() + this.slice(1);
  };
  
  // Implement the toCapitalizeWords method on String prototype
  String.prototype.toCapitalizeWords = function(): string {
    if (!this.length) return '';
    return this.split(' ')
      .map(word => word.toCapitalize())
      .join(' ');
  };
  
  // Export empty object to make this a module
  export {};
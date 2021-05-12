declare let randomDecorator: any;
import { action } from 'mobx';

export const fn = action(async input => {
  return await Promise.resolve(input);
});
export const fn2 = action(async function test(input) {
  return await Promise.resolve(input);
});
export const fn3 = action(async function(input) {
  return await Promise.resolve(input);
});
export class Test {
  test: number = 0;
  constructor() {
    var nestedFlow = action(async () => {
      var anotherNestedFlow = action(async () => {
        this.test = 5;
        await Promise.resolve(100);
      });
      this.test = 5;
      await anotherNestedFlow();
    });
  }

  @action
  async func() {
    this.test = 5;
    await Promise.resolve(100);
  }

  @action.bound
  async funcActionBound() {
    this.test = 5;
    await Promise.resolve(100);
  }

  @action
  funcBound = async () => {
    this.test = 5;
    await Promise.resolve(100);
  };

  @randomDecorator
  @action
  funcNonBound = async function(this: Test) {
    this.test = 5;
    await Promise.resolve(100);
  };
}

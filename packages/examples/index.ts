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
  value: string = '';

  constructor() {
    var nestedFlow = action(async () => {
      var anotherNestedFlow = action(async () => {
        return await Promise.resolve('5');
      });
      await anotherNestedFlow();
    });
  }

  @action
  async func(input: string) {
    this.value = await Promise.resolve(input);
  }

  @action
  funcBound = async (input: string) => {
    this.value =  await Promise.resolve(input);
  };

  @action
  funcNonBound = async function(input: string) {
    return await Promise.resolve(input);
  };
}

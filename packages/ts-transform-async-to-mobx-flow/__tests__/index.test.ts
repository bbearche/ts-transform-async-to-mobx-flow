import ts from 'typescript';
import fs from 'fs';

import createTransformer from '../src';

it('Does not convert function not marked as action', () => {
  const path = require.resolve('./fixtures/no-async-decorated');

  const source = fs.readFileSync(path).toString('utf8');
  const result = getTransformedOutput(source);

  expect(result).toMatchSnapshot();
});

it('Converts function marked as action', () => {
  const path = require.resolve('./fixtures/all-async-decorated');

  const source = fs.readFileSync(path).toString('utf8');
  const result = getTransformedOutput(source);

  expect(result).toMatchSnapshot();
});

describe('Ignore body when not an async function', () => {
  it('non-async arrow function', () => {
    const source = `
const fn = action(input => {
  this.delay(input);
});`;

    verifyOutput(getTransformedOutput(source), source);
  });

  it('non-async function', () => {
    const source = `
const fn = action(function test(input) {
  this.delay(input);
});`;
    verifyOutput(getTransformedOutput(source), source);
  });

  it('function passed as parameter', () => {
    const source = `
const fn = action(randomFunction);
`;
    verifyOutput(getTransformedOutput(source), source);
  });

  describe('class context', () => {
    it('non-async function', () => {
      const source = `
class Test {
  // non-async function
  @action
  func() {
    this.test = 5;
  }
}`;
      verifyOutput(getTransformedOutput(source), source);
    });

    it('non-async arrow function', () => {
      const source = `
  class Test {
    // non-async arrow function
    @action
    funcBound = () => {
      this.test = 5;
    };
  }`;
      verifyOutput(getTransformedOutput(source), source);
    });

    it('function passed as parameter', () => {
      const source = `
  class Test {
    // function passed as parameter
    @action
    funcNonBound = randomFunction;
  }`;
      verifyOutput(getTransformedOutput(source), source);
    });
  });
});

it('Flow import does not conflict with declared variables', () => {
  const source = `
import * as mobx from 'mobx';
let mobx_1 = '';

const fn = action(async input => {
  return await Promise.resolve(input);
});
`;
  const expectedOutput = `
import * as mobx_2 from "mobx";
import * as mobx from 'mobx';
let mobx_1 = '';
const fn = (input) => { return mobx_2.flow(function* fn_mobxFlow() {
    return yield Promise.resolve(input);
}).call(this); };
`;

  verifyOutput(getTransformedOutput(source), expectedOutput);
});

it('Transpiled correctly to ES5', () => {
  const source = `
const fn = action(async input => {
  return await Promise.resolve(input);
});
  `;
  
  const result = getTranspiledOutput(source, ts.ScriptTarget.ES5);
  expect(result).toMatchSnapshot();
});

describe('Ignore transforming nested functions #1', () => {
  // https://github.com/AurorNZ/ts-transform-async-to-mobx-flow/issues/1

  it('Inline function', () => {
    const source = `
const fn = action(async (input: number) => {
  var nestedFunc = async () => {
    return await Promise.resolve(input);
  };
  async function nestedFunc2() {
    return await Promise.resolve(input);
  }
  await nestedFunc();
  await nestedFunc2();
});
    `;
    const expectedOutput = `
import * as mobx from "mobx";
const fn = (input: number) => { return mobx.flow(function* fn_mobxFlow() {
    var nestedFunc = async () => {
        return await Promise.resolve(input);
    };
    async function nestedFunc2() {
        return await Promise.resolve(input);
    }
    yield nestedFunc();
    yield nestedFunc2();
}).call(this); };
    `;

    verifyOutput(getTransformedOutput(source), expectedOutput);
  });

  it('Class member function', () => {
    const source = `
class Test {
  @action
  async func(input: number) {
    var nestedFunc = async () => {
      return await Promise.resolve(input);
    };
    async function nestedFunc2() {
      return await Promise.resolve(input);
    }
    await nestedFunc();
    await nestedFunc2();
  }
}
    `;
    const expectedOutput = `
import * as mobx from "mobx";
class Test {
    func(input: number) { return mobx.flow(function* func_mobxFlow() {
        var nestedFunc = async () => {
            return await Promise.resolve(input);
        };
        async function nestedFunc2() {
            return await Promise.resolve(input);
        }
        yield nestedFunc();
        yield nestedFunc2();
    }).call(this); }
}
    `;

    verifyOutput(getTransformedOutput(source), expectedOutput);
  });
});

it('Generator function should use unique name #2', () => {
  // https://github.com/AurorNZ/ts-transform-async-to-mobx-flow/issues/2

  const source = `
import { someFunc } from './someFile';

class SomeClass {
  @action
  someFunc = async () => {
    await someFunc();
  }
}
`;
  const expectedOutput = `
import * as mobx from \"mobx\";
import { someFunc } from './someFile';
class SomeClass {
    someFunc = () => { return mobx.flow(function* someFunc_mobxFlow() {
        yield someFunc();
    }).call(this); };
}
`;

  verifyOutput(getTransformedOutput(source), expectedOutput);
});

function verifyOutput(transformedOutput: string, expectedOutput: string) {
  expect(removeEmptyLines(transformedOutput)).toBe(removeEmptyLines(expectedOutput));
}

function getTranspiledOutput(sourceCode: string, target: ts.ScriptTarget): string {
  const result = ts.transpileModule(sourceCode, {
    compilerOptions: {
      target: ts.ScriptTarget.ES5,
      noEmitHelpers: true,
    },
    transformers: { before: [createTransformer()] },
  });

  return result.outputText;
}

function getTransformedOutput(sourceCode: string): string {
  const printer = ts.createPrinter();

  const source = ts.createSourceFile('', sourceCode, ts.ScriptTarget.ESNext, true);
  const result = ts.transform(source, [createTransformer()]);
  const transformedSourceFile = result.transformed[0];
  const resultCode = printer.printFile(transformedSourceFile);
  return resultCode;
}

function removeEmptyLines(input: string) {
  return input
    .split(/[\n\r]/g)
    .filter(x => !/^\s*$/.test(x))
    .map(x => x.trim())
    .join('\n');
}

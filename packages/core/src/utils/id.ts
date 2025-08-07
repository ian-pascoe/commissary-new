import { init } from '@paralleldrive/cuid2';

const _createId = init({ length: 12 });

export const createId = (prefix?: string) => {
  if (prefix) {
    return `${prefix}_${_createId()}`;
  }
  return _createId();
};

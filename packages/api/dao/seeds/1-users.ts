import { AccountService } from '#api/accounts/AccountService.ts';

export const seed = async () => {
  await AccountService.register({
    email: 'john.doe@gmail.com',
    password: 'john.doe@gmail.com',
    domain: 'http://localtest.me',
  });
};

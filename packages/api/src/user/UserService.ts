import UserRepository from './UserRepository.ts';

export default class UserService {
  static async get(id: string) {
    const result = await UserRepository.get(id);
    return result;
  }
}

declare global {
  namespace Express {
    interface User {
      email: string;
      username: string;
    }
    interface Request {
      authUser?: {
        id: string;
        email: string;
        username: string;
        password?: string;
        createdAt?: Date;
        updatedAt?: Date;
      };
    }
  }
}

export {};

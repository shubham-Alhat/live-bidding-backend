declare global {
  namespace Express {
    interface Request {
      user?: {
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

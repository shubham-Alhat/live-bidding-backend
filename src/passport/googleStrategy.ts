import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || profile._json?.email;

        if (!email) {
          return done(new Error("No email provided by Google"), undefined);
        }
        const userData = {
          username:
            profile.displayName ||
            `${profile.name?.givenName || ""} ${
              profile.name?.familyName || ""
            }`.trim() ||
            profile._json?.name ||
            "UNKNOWN",
          email: email,
        };

        // done(null, userData) → Passport will attach it to req.user
        return done(null, userData);
      } catch (err) {
        return done(err as Error, undefined);
      }
    },
  ),
);

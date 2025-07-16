const passport = require("passport");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL } =
  process.env;

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_REDIRECT_URL,
      },
      async function (accessToken, refreshToken, profile, done) {
        try {
          if (profile.emails && profile.emails.length > 0) {
            let user = await prisma.user.upsert({
              where: { email: profile.emails[0].value },
              update: { 
                google_id: profile.id,
                isVerified: true
              },
              create: {
                fullname: profile.displayName,
                email: profile.emails[0].value,
                google_id: profile.id,
                isVerified: true,
                profile: {
                  create: {
                    address: "",
                    city: "",
                    province: "",
                    postal_code: "",
                    avatar_url: profile.photos?.[0]?.value || null
                  }
                }
              },
              include: {
                profile: true
              }
            });
  
            done(null, user);
          } else {
            done(new Error("No email found in profile"), null);
          }
        } catch (error) {
          done(error, null);
        }
      }
    )
  );


module.exports = passport;

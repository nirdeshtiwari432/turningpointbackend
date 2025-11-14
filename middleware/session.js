const session = require("express-session");
const flash = require("connect-flash");
const MongoStore = require("connect-mongo");
require("dotenv").config();

module.exports = (app) => {
  // Required so secure cookies work properly on Render
  app.set("trust proxy", 1);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "mysecret",
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI, // Atlas connection
        collectionName: "sessions",
        ttl: 7 * 24 * 60 * 60, // 7 days
      }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: true,         // force HTTPS-only cookies/True
        sameSite: "none",     // allow cross-site cookies (Vercel <-> Render) None
      },
    })
  );

  app.use(flash());

  app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
  });
};

require("dotenv").config();

const cron = require('node-cron');
const express = require("express");
const path = require("path");
const logger = require("morgan");
const cors = require("cors");

const routes = require("./routes");
// const updateDate = require("./services/cronjobStatusOrder");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(routes);

app.get("/", (req, res) => {
  res.send(`<h1 align="center">Welcome To API Cahaya Kreativ</h1>`);
});

// 404 error handler
app.use((req, res, next) => {
  res.status(404).json({
    status: false,
    message: `are you lost? ${req.method} ${req.url} is not registered!`,
    data: null,
  });
});

// 500 error handler
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).json({
    status: false,
    message: err.message,
    data: null,
  });
});

app.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
  // cron.schedule('* * * * *', async () => {
  //   console.log('Running scheduled job to cancel expired orders...');
  //   await updateDate();
  // });
});

module.exports = app;

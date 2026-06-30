require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/", require("./routes/authRoutes"));
app.use("/favorites", require("./routes/favoritesRoutes"));
app.use("/trips", require("./routes/tripsRoutes"));
app.use("/weather", require("./routes/weatherRoutes"));
app.use("/google-places", require("./routes/googlePlacesRoutes"));
app.use("/ai", require("./routes/aiRoutes"));

// Global Error Handler Middleware function
app.use((err, req, res, next) => {
  console.log(err.stack);
  console.log(err.name);
  console.log(err.code);

  res.status(500).json({
    message: "Something went really wrong",
  });
});

// Listen on pc port
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on PORT ${PORT}`);
});
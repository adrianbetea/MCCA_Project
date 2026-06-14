const pool = require('../config/db');

const tripsSchemaCheck = async () => {
  const tripsTableQuery = `
    CREATE TABLE IF NOT EXISTS trips (
      tripId INT AUTO_INCREMENT PRIMARY KEY,
      userId VARCHAR(36) NOT NULL,
      destination VARCHAR(255) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      budget DECIMAL(10, 2) DEFAULT 0,
      description TEXT,
      coverUrl VARCHAR(1000) DEFAULT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
    )
  `;

  const itineraryItemsTableQuery = `
    CREATE TABLE IF NOT EXISTS itinerary_items (
      itemId INT AUTO_INCREMENT PRIMARY KEY,
      tripId INT NOT NULL,
      dayDate DATE NOT NULL,
      startTime TIME,
      placeName VARCHAR(255) NOT NULL,
      placeId VARCHAR(255),
      placeAddress TEXT,
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tripId) REFERENCES trips(tripId) ON DELETE CASCADE
    )
  `;

  const expensesTableQuery = `
    CREATE TABLE IF NOT EXISTS expenses (
      expenseId INT AUTO_INCREMENT PRIMARY KEY,
      tripId INT NOT NULL,
      category VARCHAR(50) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      description TEXT,
      expenseDate DATE NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tripId) REFERENCES trips(tripId) ON DELETE CASCADE
    )
  `;

  try {
    await pool.execute(tripsTableQuery);
    console.log("Trips schema checked");

    // Add coverUrl column if it doesn't exist for users with existing database tables
    try {
      await pool.execute("ALTER TABLE trips ADD COLUMN coverUrl VARCHAR(1000) DEFAULT NULL");
      console.log("Added coverUrl column to trips table");
    } catch (columnErr) {
      // Column might already exist, swallow error
    }

    await pool.execute(itineraryItemsTableQuery);
    console.log("Itinerary items schema checked");

    await pool.execute(expensesTableQuery);
    console.log("Expenses schema checked");
  } catch (err) {
    console.error("Trips tables creation error:", err);
    throw err;
  }
};

module.exports = {
  tripsSchemaCheck
};

const express = require('express');
const fs = require('fs');
const PriorityQueue = require('./priorityQueue');
const Stack = require('./stack');

const app = express();
app.use(express.json());

const violationsQueue = new PriorityQueue();
const historyStack = new Stack();

// Endpoint to report multiple violations
app.post('/report', (req, res) => {
  const violations = req.body.violations;

  if (!Array.isArray(violations) || violations.length === 0) {
    return res.status(400).send({ message: 'Please provide an array of violations' });
  }

  violations.forEach(({ type, description, severity }) => {
    if (!type || severity === undefined) {
      return res.status(400).send({ message: 'Each violation must include a type and severity' });
    }
    const violation = { type, description, severity, timestamp: new Date() };
    violationsQueue.enqueue(violation, severity);
    historyStack.push(violation);
  });

  res.status(201).send({ message: 'Violations reported', totalViolations: violations.length });
});

// Endpoint to process all violations in priority order
app.get('/process', (req, res) => {
  if (violationsQueue.isEmpty()) {
    return res.status(200).send({ message: 'No violations to process' });
  }

  const processedViolations = [];

  while (!violationsQueue.isEmpty()) {
    const violation = violationsQueue.dequeue().element; // Access element to get actual violation data
    const fineAmount = generateFine(violation); // Calculate fine here
    violation.fineAmount = fineAmount; // Assign calculated fine to violation object
    processedViolations.push(violation);
  }

  res.status(200).send({ message: 'Processed all violations', processedViolations });
});

// Function to generate fine and store it in fines.json
function generateFine(violation) {
  const fineAmount = calculateFine(violation); // Calculate fine amount
  console.log(`Generated fine for severity ${violation.severity}: ${fineAmount}`); // Debug log

  // Add fine amount to the violation object and store it
  const fineRecord = { ...violation, fineAmount };

  // Attempt to read existing data
  let finesData;
  try {
    finesData = JSON.parse(fs.readFileSync('fines.json', 'utf-8'));
  } catch (error) {
    finesData = [];
  }

  // Add the fine record
  finesData.push(fineRecord);

  // Write data back to fines.json with additional logging
  fs.writeFileSync('fines.json', JSON.stringify(finesData, null, 2));
  console.log("Updated fines.json:", finesData); // Debug log to check updated content

  return fineAmount; // Return calculated fine amount
}

// Fine calculation based on severity
function calculateFine(violation) {
  const { severity } = violation;
  console.log(`Calculating fine for severity ${severity}`); // Debug log

  if (severity >= 8) {
    return 1500; // Very serious violations like major accidents
  } else if (severity >= 5) {
    return 1000; // Serious violations like minor accidents or signal jumps
  } else if (severity >= 3) {
    return 500; // Moderate violations like illegal parking
  } else {
    return 200; // Minor violations
  }
}

// Endpoint to undo the last reported violation
app.post('/undo', (req, res) => {
  if (historyStack.isEmpty()) {
    return res.status(400).send({ message: 'No violations to undo' });
  }

  const lastViolation = historyStack.pop();
  res.status(200).send({ message: 'Last violation undone', violation: lastViolation });
});

// Endpoint to generate a report
app.get('/generateReport', (req, res) => {
  let reportsData = [];
  try {
    reportsData = JSON.parse(fs.readFileSync('reports.json', 'utf-8'));
  } catch (error) {
    reportsData = [];
  }

  const newReport = {
    date: new Date(),
    totalViolations: historyStack.stack.length,
    pendingViolations: violationsQueue.items.length,
  };
  reportsData.push(newReport);
  fs.writeFileSync('reports.json', JSON.stringify(reportsData, null, 2));
  res.status(200).send({ message: 'Report generated', report: newReport });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

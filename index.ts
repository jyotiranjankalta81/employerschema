import express, { Request, Response } from "express";

interface Employee {
  uniqueId: number;
  name: string;
  subordinates: Employee[];
}

interface IEmployeeOrgApp {
  ceo: Employee;
  move(employeeID: number, supervisorID: number): void;
  undo(): void;
  redo(): void;
}

class EmployeeOrgApp implements IEmployeeOrgApp {
  ceo: Employee;
  private history: { move: string; undoData: Employee[] }[];
  private current: Employee;
  private redoStack: { move: string; redoData: Employee[] }[];

  constructor(ceo: Employee) {
    this.ceo = ceo;
    this.current = JSON.parse(JSON.stringify(ceo)); // Deep clone the ceo object to avoid direct reference
    this.history = [];
    this.redoStack = [];
  }

  move(employeeID: number, supervisorID: number): void {
    const employee = this.findEmployee(this.current, employeeID);
    const supervisor = this.findEmployee(this.current, supervisorID);

    if (!employee || !supervisor) {
      throw new Error("Employee or Supervisor not found");
    }

    const undoData = this.createUndoData(employee, supervisor);
    this.history.push({ move: "move", undoData });

    // Remove the employee from its current supervisor's subordinates
    const currentSupervisor = this.findEmployeeSupervisor(
      this.current,
      employeeID
    );
    if (currentSupervisor) {
      currentSupervisor.subordinates = currentSupervisor.subordinates.filter(
        (sub) => sub.uniqueId !== employeeID
      );
    }

    // Add the employee as a subordinate of the new supervisor
    supervisor.subordinates.push(employee);
  }

  undo(): void {
    if (this.history.length === 0) return;

    const lastAction = this.history.pop();
    if (lastAction?.move === "move") {
      this.current = lastAction.undoData[0];
    }
  }

  //   redo(): void {
  //     // You may implement redo functionality if required
  //   }

  redo(): void {
    if (this.redoStack.length === 0) return;

    const lastRedoAction = this.redoStack.pop();
    if (lastRedoAction?.move === "move") {
      this.history.push({ move: "move", undoData: lastRedoAction.redoData });
      this.current = lastRedoAction.redoData[1];
    }
  }

  private findEmployee(root: Employee, id: number): Employee | null {
    if (root.uniqueId === id) {
      return root;
    }

    for (const subordinate of root.subordinates) {
      const found = this.findEmployee(subordinate, id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private findEmployeeSupervisor(root: Employee, id: number): Employee | null {
    if (!root.subordinates || root.subordinates.length === 0) {
      return null;
    }

    for (const subordinate of root.subordinates) {
      if (subordinate.uniqueId === id) {
        return root;
      }

      const found = this.findEmployeeSupervisor(subordinate, id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private createUndoData(employee: Employee, supervisor: Employee): Employee[] {
    const currentSupervisor = this.findEmployeeSupervisor(
      this.current,
      employee.uniqueId
    );

    const undoData: Employee[] = [];

    // Deep clone the current structure to store the undo data
    const cloneCurrent = JSON.parse(JSON.stringify(this.current));
    undoData.push(cloneCurrent);

    if (currentSupervisor) {
      // Clone the current supervisor to store in the undo data
      const cloneSupervisor = JSON.parse(JSON.stringify(currentSupervisor));
      undoData.push(cloneSupervisor);
    }

    // Clone the employee and its subordinates to store in the undo data
    const cloneEmployee = JSON.parse(JSON.stringify(employee));
    undoData.push(cloneEmployee);

    // Clone the supervisor and its subordinates to store in the undo data
    const cloneSupervisorNew = JSON.parse(JSON.stringify(supervisor));
    undoData.push(cloneSupervisorNew);

    return undoData;
  }
}

// Example usage
const ceo: Employee = {
  uniqueId: 1,
  name: "John Smith",
  subordinates: [
    // Insert your employee data here
  ],
};

const app = new EmployeeOrgApp(ceo);

const expressApp = express();
expressApp.use(express.json());

// API route to move an employee to a new supervisor
expressApp.post("/move", (req: Request, res: Response) => {
  // Add types for 'req' and 'res'
  const { employeeID, supervisorID } = req.body;
  try {
    app.move(employeeID, supervisorID);
    res.json({ message: "Employee moved successfully" });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message }); // Use 'as Error' to cast 'unknown' type to 'Error'
  }
});

// API route to undo the last move action
expressApp.post("/undo", (req: Request, res: Response) => {
  // Add types for 'req' and 'res'
  try {
    app.undo();
    res.json({ message: "Undo successful" });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message }); // Use 'as Error' to cast 'unknown' type to 'Error'
  }
});

// API route to redo the last undone action (if required)
expressApp.post("/redo", (req: Request, res: Response) => {
  // Add types for 'req' and 'res'
  try {
    app.redo();
    res.json({ message: "Redo successful" });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message }); // Use 'as Error' to cast 'unknown' type to 'Error'
  }
});

expressApp.listen(3000, () => {
  console.log("Server running on port 3000");
});

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Edit, Trash2, Search, Calendar, PrinterIcon } from "lucide-react";
import { formatCurrency, generateId } from "@/lib/utils";
import { Employee, Attendance, getStorageData, addItem, updateItem, deleteItem, STORAGE_KEYS } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>(getStorageData<Attendance>(STORAGE_KEYS.ATTENDANCE));
  const [employees] = useState<Employee[]>(getStorageData<Employee>(STORAGE_KEYS.EMPLOYEES));
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    month: "",
    daysWorked: ""
  });
  const { toast } = useToast();

  const filteredAttendance = attendance.filter(record =>
    record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.monthDisplay.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select a valid employee.",
        variant: "destructive",
      });
      return;
    }

    const monthDate = new Date(formData.month + "-01");
    const monthDisplay = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysWorked = parseInt(formData.daysWorked);
    const monthlyWage = daysWorked * selectedEmployee.dailyWage;

    const attendanceData: Attendance = {
      id: editingAttendance?.id || generateId(),
      employeeId: formData.employeeId,
      employeeName: selectedEmployee.name,
      month: formData.month,
      monthDisplay,
      daysWorked,
      dailyWage: selectedEmployee.dailyWage,
      monthlyWage,
      createdAt: editingAttendance?.createdAt || new Date().toISOString()
    };

    if (editingAttendance) {
      updateItem<Attendance>(STORAGE_KEYS.ATTENDANCE, editingAttendance.id, attendanceData);
      toast({
        title: "Attendance Updated",
        description: `Attendance for ${selectedEmployee.name} has been updated.`,
      });
    } else {
      // Check if attendance already exists for this employee and month
      const existingRecord = attendance.find(
        record => record.employeeId === formData.employeeId && record.month === formData.month
      );
      
      if (existingRecord) {
        toast({
          title: "Error",
          description: "Attendance record already exists for this employee and month.",
          variant: "destructive",
        });
        return;
      }

      addItem<Attendance>(STORAGE_KEYS.ATTENDANCE, attendanceData);
      toast({
        title: "Attendance Added",
        description: `Attendance for ${selectedEmployee.name} has been recorded.`,
      });
    }

    setAttendance(getStorageData<Attendance>(STORAGE_KEYS.ATTENDANCE));
    resetForm();
  };

  const handleEdit = (record: Attendance) => {
    setEditingAttendance(record);
    setFormData({
      employeeId: record.employeeId,
      month: record.month,
      daysWorked: record.daysWorked.toString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (record: Attendance) => {
    if (window.confirm(`Are you sure you want to delete attendance record for ${record.employeeName}?`)) {
      deleteItem<Attendance>(STORAGE_KEYS.ATTENDANCE, record.id);
      setAttendance(getStorageData<Attendance>(STORAGE_KEYS.ATTENDANCE));
      toast({
        title: "Attendance Deleted",
        description: `Attendance record for ${record.employeeName} has been deleted.`,
        variant: "destructive",
      });
    }
  };

  const handlePrint = (employeeId?: string) => {
    const printData = employeeId 
      ? attendance.filter(record => record.employeeId === employeeId)
      : attendance;
    
    const employee = employeeId ? employees.find(emp => emp.id === employeeId) : null;
    const title = employee ? `Attendance Report - ${employee.name}` : 'All Employees Attendance Report';
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .header { text-align: center; margin-bottom: 30px; }
              .total { font-weight: bold; background-color: #f9f9f9; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${title}</h1>
              <p>Generated on: ${new Date().toLocaleDateString('en-GB')}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Month</th>
                  <th>Days Worked</th>
                  <th>Daily Wage</th>
                  <th>Monthly Wage</th>
                </tr>
              </thead>
              <tbody>
                ${printData.map(record => `
                  <tr>
                    <td>${record.employeeName}</td>
                    <td>${record.monthDisplay}</td>
                    <td>${record.daysWorked}</td>
                    <td>${formatCurrency(record.dailyWage)}</td>
                    <td>${formatCurrency(record.monthlyWage)}</td>
                  </tr>
                `).join('')}
                <tr class="total">
                  <td colspan="4"><strong>Total Monthly Wages:</strong></td>
                  <td><strong>${formatCurrency(printData.reduce((sum, record) => sum + record.monthlyWage, 0))}</strong></td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const resetForm = () => {
    setFormData({ employeeId: "", month: "", daysWorked: "" });
    setEditingAttendance(null);
    setIsDialogOpen(false);
  };

  const totalMonthlyWages = attendance.reduce((sum, record) => sum + record.monthlyWage, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Attendance Management</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
            <PrinterIcon className="w-4 h-4" />
            Print All
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => resetForm()}>
                <Plus className="w-4 h-4" />
                Add Attendance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAttendance ? "Edit Attendance" : "Add Attendance Record"}
                </DialogTitle>
                <DialogDescription>
                  {editingAttendance ? "Update attendance information below." : "Record employee attendance for the month."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee</Label>
                    <Select value={formData.employeeId} onValueChange={(value) => setFormData({ ...formData, employeeId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="month">Month</Label>
                    <Input
                      id="month"
                      type="month"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="daysWorked">Days Worked</Label>
                    <Input
                      id="daysWorked"
                      type="number"
                      min="0"
                      max="31"
                      value={formData.daysWorked}
                      onChange={(e) => setFormData({ ...formData, daysWorked: e.target.value })}
                      placeholder="Number of days"
                      required
                    />
                  </div>
                  {formData.employeeId && formData.daysWorked && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Monthly Wage Preview: {formatCurrency(
                          parseInt(formData.daysWorked) * 
                          (employees.find(emp => emp.id === formData.employeeId)?.dailyWage || 0)
                        )}
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAttendance ? "Update Attendance" : "Add Attendance"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Summary</CardTitle>
          <CardDescription>Overview of workforce attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{attendance.length}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {attendance.reduce((sum, record) => sum + record.daysWorked, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Days Worked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {formatCurrency(totalMonthlyWages)}
              </div>
              <div className="text-sm text-muted-foreground">Total Monthly Wages</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>Track employee attendance and wages</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search attendance..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAttendance.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No attendance records match your search." : "No attendance records added yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Days Worked</TableHead>
                    <TableHead>Daily Wage</TableHead>
                    <TableHead>Monthly Wage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{record.employeeName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {record.monthDisplay}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{record.daysWorked} days</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(record.dailyWage)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(record.monthlyWage)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(record.employeeId)}
                            title="Print employee report"
                          >
                            <PrinterIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(record)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
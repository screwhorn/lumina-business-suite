import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Plus, Edit, Trash2, Search, Printer } from "lucide-react";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import { Payment, Invoice, getStorageData, addItem, updateItem, deleteItem, STORAGE_KEYS } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>(getStorageData<Payment>(STORAGE_KEYS.PAYMENTS));
  const [invoices, setInvoices] = useState<Invoice[]>(getStorageData<Invoice>(STORAGE_KEYS.INVOICES));
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    invoiceId: "",
    invoiceNo: "",
    paymentDate: formatDate(new Date()),
    method: "",
    amount: "",
    notes: ""
  });
  const { toast } = useToast();

  const filteredPayments = payments.filter(payment =>
    payment.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paymentMethods = ["Cash", "Bank Transfer", "Credit Card", "Cheque", "Online Payment"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentData: Payment = {
      id: editingPayment?.id || generateId(),
      invoiceId: formData.invoiceId,
      invoiceNo: formData.invoiceNo,
      paymentDate: formData.paymentDate,
      method: formData.method,
      amount: parseFloat(formData.amount),
      notes: formData.notes,
      createdAt: editingPayment?.createdAt || new Date().toISOString()
    };

    if (editingPayment) {
      updateItem<Payment>(STORAGE_KEYS.PAYMENTS, editingPayment.id, paymentData);
      toast({
        title: "Payment Updated",
        description: "Payment record has been updated successfully.",
      });
    } else {
      addItem(STORAGE_KEYS.PAYMENTS, paymentData);
      
      // Update invoice payment status
      const invoice = invoices.find(inv => inv.id === formData.invoiceId);
      if (invoice) {
        const newPaidAmount = invoice.paidAmount + paymentData.amount;
        const newBalance = invoice.grandTotal - newPaidAmount;
        const newStatus = newBalance <= 0 ? "paid" : newPaidAmount > 0 ? "partial" : "pending";
        
        updateItem<Invoice>(STORAGE_KEYS.INVOICES, invoice.id, {
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          paymentStatus: newStatus as any
        });
        
        setInvoices(getStorageData<Invoice>(STORAGE_KEYS.INVOICES));
      }
      
      toast({
        title: "Payment Added",
        description: "Payment has been recorded successfully.",
      });
    }

    setPayments(getStorageData<Payment>(STORAGE_KEYS.PAYMENTS));
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      invoiceId: "",
      invoiceNo: "",
      paymentDate: formatDate(new Date()),
      method: "",
      amount: "",
      notes: ""
    });
    setEditingPayment(null);
    setIsDialogOpen(false);
  };

  const handleDelete = (payment: Payment) => {
    if (window.confirm(`Are you sure you want to delete this payment?`)) {
      deleteItem<Payment>(STORAGE_KEYS.PAYMENTS, payment.id);
      setPayments(getStorageData<Payment>(STORAGE_KEYS.PAYMENTS));
      toast({
        title: "Payment Deleted",
        description: "Payment record has been deleted successfully.",
        variant: "destructive",
      });
    }
  };

  const totalPayments = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Payment Management</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => resetForm()}>
              <Plus className="w-4 h-4" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>
                Record a payment received for an invoice.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNo">Invoice</Label>
                  <Select 
                    value={formData.invoiceId} 
                    onValueChange={(value) => {
                      const invoice = invoices.find(inv => inv.id === value);
                      setFormData({ 
                        ...formData, 
                        invoiceId: value,
                        invoiceNo: invoice?.invoiceNo || ""
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.filter(inv => inv.balanceAmount > 0).map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNo} - {invoice.client} ({formatCurrency(invoice.balanceAmount)} due)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate.split('-').reverse().join('-')}
                    onChange={(e) => setFormData({ ...formData, paymentDate: formatDate(new Date(e.target.value)) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (﷼)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about the payment"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">Record Payment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>Overview of all payments received</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{payments.length}</div>
              <div className="text-sm text-muted-foreground">Total Payments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{formatCurrency(totalPayments)}</div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {formatCurrency(totalPayments / Math.max(payments.length, 1))}
              </div>
              <div className="text-sm text-muted-foreground">Average Payment</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Records</CardTitle>
              <CardDescription>Track all received payments</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <Banknote className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No payments match your search." : "No payments recorded yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{payment.invoiceNo}</TableCell>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="max-w-48 truncate">
                        {payment.notes || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(payment)}
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
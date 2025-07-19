import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Plus, Edit, Trash2, Search, Eye, Printer, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate, generateId, generateInvoiceNumber, numberToWords } from "@/lib/utils";
import { Invoice, QuotationItem, getStorageData, addItem, updateItem, deleteItem, STORAGE_KEYS } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(getStorageData<Invoice>(STORAGE_KEYS.INVOICES));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    invoiceNo: generateInvoiceNumber(),
    date: formatDate(new Date()),
    dueDate: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
    client: "",
    contact: "",
    project: "",
    location: "",
    trn: "",
    vatPercentage: "15",
    paymentStatus: "pending" as "paid" | "partial" | "pending"
  });
  const [items, setItems] = useState<QuotationItem[]>([
    { id: generateId(), description: "", qty: "", rate: "", amount: 0 }
  ]);
  const { toast } = useToast();

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.project.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const vatAmount = (subtotal * parseFloat(formData.vatPercentage)) / 100;
    const grandTotal = subtotal + vatAmount;
    return { subtotal, vatAmount, grandTotal };
  };

  const updateItemAmount = (index: number, qty: string, rate: string) => {
    const qtyNum = parseFloat(qty) || 0;
    const rateNum = parseFloat(rate) || 0;
    const amount = qtyNum * rateNum;
    
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], qty, rate, amount };
    setItems(updatedItems);
  };

  const addItemRow = () => {
    setItems([...items, { id: generateId(), description: "", qty: "", rate: "", amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { subtotal, vatAmount, grandTotal } = calculateTotals();
    
    const invoiceData: Invoice = {
      id: editingInvoice?.id || generateId(),
      invoiceNo: formData.invoiceNo,
      date: formData.date,
      dueDate: formData.dueDate,
      client: formData.client,
      contact: formData.contact,
      project: formData.project,
      location: formData.location,
      trn: formData.trn,
      items: items.filter(item => item.description.trim() !== ""),
      subtotal,
      vatPercentage: parseFloat(formData.vatPercentage),
      vatAmount,
      grandTotal,
      amountInWords: numberToWords(grandTotal),
      paymentStatus: formData.paymentStatus,
      paidAmount: formData.paymentStatus === "paid" ? grandTotal : (editingInvoice?.paidAmount || 0),
      balanceAmount: formData.paymentStatus === "paid" ? 0 : grandTotal - (editingInvoice?.paidAmount || 0),
      createdAt: editingInvoice?.createdAt || new Date().toISOString()
    };

    if (editingInvoice) {
      updateItem<Invoice>(STORAGE_KEYS.INVOICES, editingInvoice.id, invoiceData);
      toast({
        title: "Invoice Updated",
        description: `Invoice ${invoiceData.invoiceNo} has been updated successfully.`,
      });
    } else {
      addItem<Invoice>(STORAGE_KEYS.INVOICES, invoiceData);
      toast({
        title: "Invoice Created",
        description: `Invoice ${invoiceData.invoiceNo} has been created successfully.`,
      });
    }

    setInvoices(getStorageData<Invoice>(STORAGE_KEYS.INVOICES));
    resetForm();
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoiceNo: invoice.invoiceNo,
      date: invoice.date,
      dueDate: invoice.dueDate,
      client: invoice.client,
      contact: invoice.contact,
      project: invoice.project,
      location: invoice.location,
      trn: invoice.trn,
      vatPercentage: invoice.vatPercentage.toString(),
      paymentStatus: invoice.paymentStatus
    });
    setItems(invoice.items.length > 0 ? invoice.items : [
      { id: generateId(), description: "", qty: "", rate: "", amount: 0 }
    ]);
    setIsDialogOpen(true);
  };

  const handleView = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setIsViewOpen(true);
  };

  const handlePrint = (invoice: Invoice) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info-section { margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f8f9fa; }
            .totals { margin-top: 20px; text-align: right; }
            .amount-words { margin-top: 20px; font-weight: bold; }
            .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status.paid { background-color: #d4edda; color: #155724; }
            .status.partial { background-color: #fff3cd; color: #856404; }
            .status.pending { background-color: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <h2>Lumina Business Suite</h2>
          </div>
          
          <div class="info-section">
            <p><strong>Invoice No:</strong> ${invoice.invoiceNo}</p>
            <p><strong>Date:</strong> ${invoice.date}</p>
            <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
            <p><strong>Client:</strong> ${invoice.client}</p>
            <p><strong>Contact:</strong> ${invoice.contact}</p>
            <p><strong>Project:</strong> ${invoice.project}</p>
            <p><strong>Location:</strong> ${invoice.location}</p>
            <p><strong>TRN:</strong> ${invoice.trn}</p>
            <p><strong>Status:</strong> <span class="status ${invoice.paymentStatus}">${invoice.paymentStatus.toUpperCase()}</span></p>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.qty}</td>
                  <td>${item.rate}</td>
                  <td>${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <p><strong>Subtotal: ${formatCurrency(invoice.subtotal)}</strong></p>
            <p><strong>VAT (${invoice.vatPercentage}%): ${formatCurrency(invoice.vatAmount)}</strong></p>
            <p style="font-size: 1.2em;"><strong>Grand Total: ${formatCurrency(invoice.grandTotal)}</strong></p>
            <p><strong>Paid Amount: ${formatCurrency(invoice.paidAmount)}</strong></p>
            <p><strong>Balance: ${formatCurrency(invoice.balanceAmount)}</strong></p>
          </div>
          
          <div class="amount-words">
            <p>Amount in Words: ${invoice.amountInWords}</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDelete = (invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNo}?`)) {
      deleteItem<Invoice>(STORAGE_KEYS.INVOICES, invoice.id);
      setInvoices(getStorageData<Invoice>(STORAGE_KEYS.INVOICES));
      toast({
        title: "Invoice Deleted",
        description: `Invoice ${invoice.invoiceNo} has been deleted successfully.`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceNo: generateInvoiceNumber(),
      date: formatDate(new Date()),
      dueDate: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      client: "",
      contact: "",
      project: "",
      location: "",
      trn: "",
      vatPercentage: "15",
      paymentStatus: "pending"
    });
    setItems([{ id: generateId(), description: "", qty: "", rate: "", amount: 0 }]);
    setEditingInvoice(null);
    setIsDialogOpen(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="w-4 h-4" />;
      case "partial": return <Clock className="w-4 h-4" />;
      case "pending": return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success/10 text-success border-success/20";
      case "partial": return "bg-warning/10 text-warning border-warning/20";
      case "pending": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const { subtotal, vatAmount, grandTotal } = calculateTotals();

  // Calculate summary statistics
  const totalInvoices = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Invoice Management</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => resetForm()}>
              <Plus className="w-4 h-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
              </DialogTitle>
              <DialogDescription>
                Fill in the invoice details and items below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNo">Invoice No.</Label>
                    <Input
                      id="invoiceNo"
                      value={formData.invoiceNo}
                      onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date.split('-').reverse().join('-')}
                      onChange={(e) => setFormData({ ...formData, date: formatDate(new Date(e.target.value)) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate.split('-').reverse().join('-')}
                      onChange={(e) => setFormData({ ...formData, dueDate: formatDate(new Date(e.target.value)) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus">Payment Status</Label>
                    <Select value={formData.paymentStatus} onValueChange={(value: any) => setFormData({ ...formData, paymentStatus: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Client</Label>
                    <Input
                      id="client"
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Input
                      id="project"
                      value={formData.project}
                      onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trn">TRN</Label>
                    <Input
                      id="trn"
                      value={formData.trn}
                      onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatPercentage">VAT %</Label>
                    <Input
                      id="vatPercentage"
                      type="number"
                      step="0.01"
                      value={formData.vatPercentage}
                      onChange={(e) => setFormData({ ...formData, vatPercentage: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 border rounded-lg">
                        <div className="md:col-span-2">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => {
                              const updatedItems = [...items];
                              updatedItems[index] = { ...updatedItems[index], description: e.target.value };
                              setItems(updatedItems);
                            }}
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="Qty"
                            value={item.qty}
                            onChange={(e) => updateItemAmount(index, e.target.value, item.rate)}
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="Rate"
                            value={item.rate}
                            onChange={(e) => updateItemAmount(index, item.qty, e.target.value)}
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="Amount"
                            value={formatCurrency(item.amount)}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            className="w-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 text-right">
                  <p><strong>Subtotal: {formatCurrency(subtotal)}</strong></p>
                  <p><strong>VAT ({formData.vatPercentage}%): {formatCurrency(vatAmount)}</strong></p>
                  <p className="text-lg"><strong>Grand Total: {formatCurrency(grandTotal)}</strong></p>
                  <p className="text-sm text-muted-foreground">
                    Amount in Words: {numberToWords(grandTotal)}
                  </p>
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingInvoice ? "Update Invoice" : "Create Invoice"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Invoices</CardTitle>
            <CardDescription>All issued invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Value</CardTitle>
            <CardDescription>Sum of all invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalInvoices)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Paid</CardTitle>
            <CardDescription>Received payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Outstanding</CardTitle>
            <CardDescription>Pending payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>Manage your invoices and track payments</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "No invoices match your filters." 
                  : "No invoices created yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell>{invoice.client}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(invoice.grandTotal)}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(invoice.paidAmount)}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(invoice.balanceAmount)}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(invoice.paymentStatus)} border`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(invoice.paymentStatus)}
                            {invoice.paymentStatus.charAt(0).toUpperCase() + invoice.paymentStatus.slice(1)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(invoice)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(invoice)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(invoice)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(invoice)}
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

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {viewingInvoice && `Invoice ${viewingInvoice.invoiceNo} - ${viewingInvoice.client}`}
            </DialogDescription>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Invoice No:</strong> {viewingInvoice.invoiceNo}</div>
                <div><strong>Date:</strong> {viewingInvoice.date}</div>
                <div><strong>Due Date:</strong> {viewingInvoice.dueDate}</div>
                <div>
                  <strong>Status:</strong>{' '}
                  <Badge className={`${getStatusColor(viewingInvoice.paymentStatus)} border ml-2`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(viewingInvoice.paymentStatus)}
                      {viewingInvoice.paymentStatus.charAt(0).toUpperCase() + viewingInvoice.paymentStatus.slice(1)}
                    </div>
                  </Badge>
                </div>
                <div><strong>Client:</strong> {viewingInvoice.client}</div>
                <div><strong>Contact:</strong> {viewingInvoice.contact}</div>
                <div><strong>Project:</strong> {viewingInvoice.project}</div>
                <div><strong>Location:</strong> {viewingInvoice.location}</div>
                <div><strong>TRN:</strong> {viewingInvoice.trn}</div>
                <div><strong>VAT:</strong> {viewingInvoice.vatPercentage}%</div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-3">Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingInvoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>{item.rate}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="text-right space-y-2">
                <p><strong>Subtotal: {formatCurrency(viewingInvoice.subtotal)}</strong></p>
                <p><strong>VAT ({viewingInvoice.vatPercentage}%): {formatCurrency(viewingInvoice.vatAmount)}</strong></p>
                <p className="text-lg"><strong>Grand Total: {formatCurrency(viewingInvoice.grandTotal)}</strong></p>
                <p><strong>Paid Amount: {formatCurrency(viewingInvoice.paidAmount)}</strong></p>
                <p><strong>Balance: {formatCurrency(viewingInvoice.balanceAmount)}</strong></p>
                <p className="text-sm text-muted-foreground">
                  <strong>Amount in Words:</strong> {viewingInvoice.amountInWords}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            {viewingInvoice && (
              <Button onClick={() => handlePrint(viewingInvoice)} className="gap-2">
                <Printer className="w-4 h-4" />
                Print Invoice
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
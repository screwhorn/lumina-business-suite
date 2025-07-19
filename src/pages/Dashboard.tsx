import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getStorageData, STORAGE_KEYS, Employee, Expense, Invoice, Quotation, Payment } from "@/lib/storage";
import { LayoutDashboard, TrendingUp, Users, Receipt, FileText, CreditCard, Banknote, AlertCircle } from "lucide-react";

export default function Dashboard() {
  // Get data from storage
  const employees = getStorageData<Employee>(STORAGE_KEYS.EMPLOYEES);
  const expenses = getStorageData<Expense>(STORAGE_KEYS.EXPENSES);
  const quotations = getStorageData<Quotation>(STORAGE_KEYS.QUOTATIONS);
  const invoices = getStorageData<Invoice>(STORAGE_KEYS.INVOICES);
  const payments = getStorageData<Payment>(STORAGE_KEYS.PAYMENTS);

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalQuotations = quotations.reduce((sum, quotation) => sum + quotation.grandTotal, 0);
  const totalInvoices = invoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0);
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstandingAmount = invoices.reduce((sum, invoice) => sum + invoice.balanceAmount, 0);
  
  const pendingInvoices = invoices.filter(invoice => invoice.paymentStatus === 'pending');
  const partialInvoices = invoices.filter(invoice => invoice.paymentStatus === 'partial');

  // Recent activity (last 5 items across all modules)
  const recentActivity = [
    ...expenses.slice(-3).map(item => ({ type: 'expense', ...item })),
    ...invoices.slice(-2).map(item => ({ type: 'invoice', ...item })),
    ...quotations.slice(-2).map(item => ({ type: 'quotation', ...item })),
    ...payments.slice(-3).map(item => ({ type: 'payment', ...item }))
  ]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 8);

  const stats = [
    {
      title: "Total Employees",
      value: employees.length,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(totalExpenses),
      icon: Receipt,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Total Quotations",
      value: formatCurrency(totalQuotations),
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Total Invoices",
      value: formatCurrency(totalInvoices),
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Payments",
      value: formatCurrency(totalPayments),
      icon: Banknote,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Outstanding Amount",
      value: formatCurrency(outstandingAmount),
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={stat.title} className="hover:shadow-card transition-all duration-300" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="hover:shadow-card transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest transactions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      {item.type === 'expense' && <Receipt className="w-4 h-4 text-red-500" />}
                      {item.type === 'invoice' && <CreditCard className="w-4 h-4 text-green-500" />}
                      {item.type === 'quotation' && <FileText className="w-4 h-4 text-purple-500" />}
                      {item.type === 'payment' && <Banknote className="w-4 h-4 text-indigo-500" />}
                      <div>
                        <p className="font-medium text-sm">
                          {item.type === 'expense' && (item as any).description}
                          {item.type === 'invoice' && `Invoice ${(item as any).invoiceNo}`}
                          {item.type === 'quotation' && `Quotation ${(item as any).quotationNo}`}
                          {item.type === 'payment' && `Payment for ${(item as any).invoiceNo}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.type === 'expense' && (item as any).category}
                          {(item.type === 'invoice' || item.type === 'quotation') && (item as any).client}
                          {item.type === 'payment' && (item as any).method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency((item as any).amount || (item as any).grandTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date((item as any).createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Alerts */}
        <Card className="hover:shadow-card transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Payment Alerts
            </CardTitle>
            <CardDescription>Pending and partial payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvoices.length === 0 && partialInvoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">All payments up to date!</p>
              ) : (
                <>
                  {pendingInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div>
                        <p className="font-medium text-sm">{invoice.invoiceNo}</p>
                        <p className="text-xs text-muted-foreground">{invoice.client}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">Pending</Badge>
                        <p className="text-sm font-medium mt-1">{formatCurrency(invoice.grandTotal)}</p>
                      </div>
                    </div>
                  ))}
                  {partialInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <div>
                        <p className="font-medium text-sm">{invoice.invoiceNo}</p>
                        <p className="text-xs text-muted-foreground">{invoice.client}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">Partial</Badge>
                        <p className="text-sm font-medium mt-1">{formatCurrency(invoice.balanceAmount)}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
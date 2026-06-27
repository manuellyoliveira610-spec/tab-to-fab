import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, Trash2, CreditCard as CardIcon,
  LayoutDashboard, ArrowLeftRight, Settings, Sparkles, AlertTriangle, Target, Bell, Clock,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { brl, MONTHS, monthKey, store, useFinance, type Transaction, type TxKind, type Status, type Goal, type CreditCard } from "@/lib/finance-store";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle Financeiro — Suas finanças no controle" },
      { name: "description", content: "Aplicativo de controle financeiro pessoal: receitas, despesas, investimentos e cartões em um só lugar." },
      { property: "og:title", content: "Controle Financeiro" },
      { property: "og:description", content: "Receitas, despesas, investimentos e cartões em um só lugar." },
    ],
  }),
  component: App,
});

function App() {
  const state = useFinance();
  const now = new Date();
  const [ym, setYm] = useState<string>(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  const monthTx = useMemo(
    () => state.transactions.filter((t) => monthKey(t.date) === ym),
    [state.transactions, ym],
  );

  const totals = useMemo(() => {
    const sum = (k: TxKind) => monthTx.filter((t) => t.kind === k).reduce((a, b) => a + b.amount, 0);
    const receita = sum("receita");
    const despesa = sum("despesa");
    const investimento = sum("investimento");
    const saldo = receita - despesa - investimento;
    const economia = receita > 0 ? (saldo / receita) * 100 : 0;
    return { receita, despesa, investimento, saldo, economia };
  }, [monthTx]);

  const [y, m] = ym.split("-").map(Number);
  const monthLabel = `${MONTHS[m - 1]} ${y}`;

  function changeMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="min-h-screen pb-24">
      <Toaster theme="dark" position="top-center" richColors />

      <header className="px-5 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5" />
              Controle Financeiro
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-1">
              Olá, <span className="text-gradient">você</span>
            </h1>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-card/70 backdrop-blur px-2 py-1 border">
            <button onClick={() => changeMonth(-1)} className="w-7 h-7 rounded-full hover:bg-muted text-muted-foreground">‹</button>
            <span className="text-xs font-medium px-2 min-w-[110px] text-center">{monthLabel}</span>
            <button onClick={() => changeMonth(1)} className="w-7 h-7 rounded-full hover:bg-muted text-muted-foreground">›</button>
          </div>
        </div>
      </header>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsContent value="dashboard" className="mt-0">
          <Dashboard totals={totals} monthTx={monthTx} cards={state.cards} />
        </TabsContent>
        <TabsContent value="transacoes" className="mt-0">
          <TransactionsTab monthTx={monthTx} state={state} ym={ym} />
        </TabsContent>
        <TabsContent value="cartoes" className="mt-0">
          <CardsTab state={state} />
        </TabsContent>
        <TabsContent value="ajustes" className="mt-0">
          <SettingsTab state={state} />
        </TabsContent>

        <nav className="fixed bottom-0 inset-x-0 z-40">
          <div className="mx-auto max-w-md px-4 pb-4">
            <TabsList className="w-full h-16 bg-card/90 backdrop-blur-xl border shadow-card rounded-2xl p-1.5 grid grid-cols-4">
              <NavItem value="dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Início" />
              <NavItem value="transacoes" icon={<ArrowLeftRight className="w-5 h-5" />} label="Lançar" />
              <NavItem value="cartoes" icon={<CardIcon className="w-5 h-5" />} label="Cartões" />
              <NavItem value="ajustes" icon={<Settings className="w-5 h-5" />} label="Ajustes" />
            </TabsList>
          </div>
        </nav>
      </Tabs>
    </div>
  );
}

function NavItem({ value, icon, label }: { value: string; icon: React.ReactNode; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="flex-col gap-0.5 rounded-xl data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow text-muted-foreground"
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </TabsTrigger>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard({
  totals, monthTx, cards,
}: {
  totals: { receita: number; despesa: number; investimento: number; saldo: number; economia: number };
  monthTx: Transaction[];
  cards: ReturnType<typeof useFinance>["cards"];
}) {
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthTx.filter((t) => t.kind === "despesa").forEach((t) => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  const maxCat = byCategory[0]?.[1] || 1;

  return (
    <div className="px-5 space-y-4">
      {/* Saldo hero card */}
      <Card className="gradient-primary border-0 text-primary-foreground p-5 shadow-glow overflow-hidden relative">
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-xs opacity-80">Saldo do mês</p>
          <p className="text-4xl font-bold tracking-tight mt-1">{brl(totals.saldo)}</p>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
              {totals.economia.toFixed(1)}% economizado
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Receita" value={totals.receita} tone="success" />
        <StatCard icon={<TrendingDown className="w-4 h-4" />} label="Despesa" value={totals.despesa} tone="destructive" />
        <StatCard icon={<PiggyBank className="w-4 h-4" />} label="Invest." value={totals.investimento} tone="primary" />
      </div>

      <Card className="p-5 gradient-card border shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Despesas por categoria</h3>
          <span className="text-xs text-muted-foreground">{byCategory.length} categorias</span>
        </div>
        {byCategory.length === 0 ? (
          <EmptyHint text="Nenhuma despesa neste mês" />
        ) : (
          <div className="space-y-3">
            {byCategory.slice(0, 6).map(([cat, val]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{cat}</span>
                  <span className="text-muted-foreground">{brl(val)}</span>
                </div>
                <Progress value={(val / maxCat) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 gradient-card border shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Últimas movimentações</h3>
        </div>
        {monthTx.length === 0 ? (
          <EmptyHint text="Sem lançamentos. Vá em Lançar para adicionar." />
        ) : (
          <div className="divide-y divide-border">
            {monthTx.slice(0, 5).map((t) => (
              <TxRow key={t.id} t={t} />
            ))}
          </div>
        )}
      </Card>

      {cards.length > 0 && (
        <Card className="p-5 gradient-card border shadow-card">
          <h3 className="font-semibold mb-3">Cartões</h3>
          <div className="space-y-3">
            {cards.map((c) => {
              const pct = c.limit > 0 ? (c.used / c.limit) * 100 : 0;
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">{brl(c.used)} / {brl(c.limit)}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number; tone: "success" | "destructive" | "primary" }) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-primary-glow";
  return (
    <Card className="p-3 gradient-card border shadow-card">
      <div className={`flex items-center gap-1.5 ${toneClass} text-xs font-medium`}>
        {icon}
        {label}
      </div>
      <p className="text-base font-bold mt-1.5 tracking-tight">{brl(value)}</p>
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-2">{text}</p>;
}

function TxRow({ t, onDelete }: { t: Transaction; onDelete?: () => void }) {
  const positive = t.kind === "receita";
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
        positive ? "bg-success/15 text-success" : t.kind === "investimento" ? "bg-primary/20 text-primary-glow" : "bg-destructive/15 text-destructive"
      }`}>
        {positive ? <TrendingUp className="w-4 h-4" /> : t.kind === "investimento" ? <PiggyBank className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{t.description}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")} · {t.category} · {t.payment}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${positive ? "text-success" : t.kind === "investimento" ? "text-primary-glow" : "text-foreground"}`}>
          {positive ? "+" : "-"} {brl(t.amount)}
        </p>
        <Badge variant="outline" className="text-[10px] mt-0.5 font-normal">
          {t.status}
        </Badge>
      </div>
      {onDelete && (
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* ---------- Transactions ---------- */
function TransactionsTab({
  monthTx, state, ym,
}: { monthTx: Transaction[]; state: ReturnType<typeof useFinance>; ym: string }) {
  const [filter, setFilter] = useState<"todos" | TxKind>("todos");
  const filtered = filter === "todos" ? monthTx : monthTx.filter((t) => t.kind === filter);

  return (
    <div className="px-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lançamentos</h2>
        <NewTransactionDialog state={state} defaultDate={`${ym}-${String(new Date().getDate()).padStart(2, "0")}`} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(["todos", "receita", "despesa", "investimento"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`text-xs py-2 rounded-lg border transition-colors capitalize ${
              filter === k ? "gradient-primary text-primary-foreground border-transparent" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <Card className="p-4 gradient-card border shadow-card">
        {filtered.length === 0 ? (
          <EmptyHint text="Nenhum lançamento para este filtro." />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((t) => (
              <TxRow key={t.id} t={t} onDelete={() => { store.removeTransaction(t.id); toast.success("Lançamento removido"); }} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function NewTransactionDialog({ state, defaultDate }: { state: ReturnType<typeof useFinance>; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Transaction, "id">>({
    date: defaultDate,
    description: "",
    kind: "despesa",
    type: state.lists.types[0] ?? "Variável",
    category: state.lists.categories[0] ?? "Outros",
    payment: state.lists.payments[0] ?? "Pix",
    status: "Pago",
    amount: 0,
  });

  function submit() {
    if (!form.description.trim() || !form.amount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    store.addTransaction(form);
    toast.success("Lançamento adicionado");
    setOpen(false);
    setForm({ ...form, description: "", amount: 0 });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-primary-foreground border-0 shadow-glow">
          <Plus className="w-4 h-4 mr-1" /> Novo
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as TxKind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="investimento">Investimento</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Descrição" className="col-span-2">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Mercado" />
          </Field>
          <Field label="Valor">
            <Input type="number" inputMode="decimal" step="0.01" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Categoria">
            <SelectFromList value={form.category} options={state.lists.categories} onChange={(v) => setForm({ ...form, category: v })} />
          </Field>
          <Field label="Forma de pagamento">
            <SelectFromList value={form.payment} options={state.lists.payments} onChange={(v) => setForm({ ...form, payment: v })} />
          </Field>
          <Field label="Recorrência">
            <SelectFromList value={form.type} options={state.lists.types} onChange={(v) => setForm({ ...form, type: v })} />
          </Field>
          <Field label="Status" className="col-span-2">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {state.lists.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={submit} className="gradient-primary text-primary-foreground border-0 w-full">Salvar lançamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SelectFromList({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ---------- Cards ---------- */
function CardsTab({ state }: { state: ReturnType<typeof useFinance> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", limit: 0, used: 0, dueDate: new Date().toISOString().slice(0, 10), status: "Pendente" as Status });

  function submit() {
    if (!form.name.trim() || !form.limit) return toast.error("Preencha nome e limite");
    store.addCard(form);
    toast.success("Cartão adicionado");
    setOpen(false);
    setForm({ name: "", limit: 0, used: 0, dueDate: new Date().toISOString().slice(0, 10), status: "Pendente" });
  }

  return (
    <div className="px-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cartões & Limites</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground border-0 shadow-glow">
              <Plus className="w-4 h-4 mr-1" /> Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader><DialogTitle>Novo cartão</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome" className="col-span-2">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Nubank" />
              </Field>
              <Field label="Limite">
                <Input type="number" value={form.limit || ""} onChange={(e) => setForm({ ...form, limit: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label="Utilizado">
                <Input type="number" value={form.used || ""} onChange={(e) => setForm({ ...form, used: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label="Vencimento">
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {state.lists.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <Button onClick={submit} className="gradient-primary text-primary-foreground border-0 w-full">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {state.cards.length === 0 ? (
        <Card className="p-6 gradient-card border shadow-card text-center">
          <CardIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <EmptyHint text="Nenhum cartão cadastrado." />
        </Card>
      ) : (
        <div className="space-y-3">
          {state.cards.map((c) => {
            const pct = c.limit > 0 ? (c.used / c.limit) * 100 : 0;
            const avail = c.limit - c.used;
            return (
              <Card key={c.id} className="p-5 gradient-card border shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vence {new Date(c.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.status === "Pago" ? "default" : "outline"} className={c.status === "Pago" ? "bg-success text-success-foreground" : ""}>
                      {c.status}
                    </Badge>
                    <button onClick={() => store.removeCard(c.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Utilizado {brl(c.used)}</span>
                    <span>Disp. {brl(avail)}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-[10px] text-muted-foreground text-right">{pct.toFixed(1)}% de {brl(c.limit)}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Settings ---------- */
function SettingsTab({ state }: { state: ReturnType<typeof useFinance> }) {
  const groups: { key: keyof typeof state.lists; label: string }[] = [
    { key: "categories", label: "Categorias" },
    { key: "payments", label: "Formas de pagamento" },
    { key: "investments", label: "Tipos de investimento" },
    { key: "cards", label: "Cartões" },
    { key: "goals", label: "Metas" },
    { key: "types", label: "Tipos (Fixo/Variável/Parcelado)" },
  ];

  return (
    <div className="px-5 space-y-4">
      <h2 className="text-lg font-semibold">Ajustes</h2>
      {groups.map((g) => (
        <ListEditor key={g.key} label={g.label} values={state.lists[g.key] as string[]} onChange={(vals) => store.updateList(g.key as never, vals as never)} />
      ))}
      <Card className="p-4 gradient-card border shadow-card">
        <h3 className="font-semibold mb-2">Dados</h3>
        <p className="text-xs text-muted-foreground mb-3">Seus dados ficam salvos apenas neste dispositivo.</p>
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={() => {
            if (confirm("Apagar todos os dados?")) {
              store.reset();
              toast.success("Dados apagados");
            }
          }}
        >
          Apagar todos os dados
        </Button>
      </Card>
    </div>
  );
}

function ListEditor({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  return (
    <Card className="p-4 gradient-card border shadow-card">
      <h3 className="font-semibold mb-3">{label}</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1.5 py-1 px-2.5">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-muted-foreground hover:text-destructive">
              ×
            </button>
          </Badge>
        ))}
        {values.length === 0 && <p className="text-xs text-muted-foreground">Vazio</p>}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Adicionar…" className="h-9" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const v = input.trim();
            if (v && !values.includes(v)) onChange([...values, v]);
            setInput("");
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

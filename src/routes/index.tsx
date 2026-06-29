import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, PiggyBank, Plus, Trash2, CreditCard as CardIcon,
  LayoutDashboard, ArrowLeftRight, Settings, Sparkles, AlertTriangle, Target, Bell, Clock, LineChart, Check, User,
  Eye, EyeOff, ChevronRight, ChevronDown, Calendar, ArrowUpRight, ArrowDownRight,
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
import {
  brl, MONTHS, monthKey, yearKey, store, useFinance,
  type Transaction, type TxKind, type Status, type Goal, type CreditCard, type ThemeName,
} from "@/lib/finance-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Myx+ — Suas finanças no controle" },
      { name: "description", content: "Myx+: receitas, despesas, investimentos, metas e cartões em um só lugar." },
      { property: "og:title", content: "Myx+" },
      { property: "og:description", content: "Receitas, despesas, investimentos, metas e cartões em um só lugar." },
    ],
  }),
  component: App,
});

const DARK_THEMES: ThemeName[] = ["dark"];

function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  if (DARK_THEMES.includes(theme)) html.classList.add("dark");
  else html.classList.remove("dark");
}

type ViewMode = "month" | "year";

function App() {
  const state = useFinance();
  const now = new Date();
  const [view, setView] = useState<ViewMode>("month");
  const [ym, setYm] = useState<string>(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => { applyTheme(state.theme); }, [state.theme]);

  const periodTx = useMemo(() => {
    if (view === "month") return state.transactions.filter((t) => monthKey(t.date) === ym);
    return state.transactions.filter((t) => yearKey(t.date) === year);
  }, [state.transactions, view, ym, year]);

  const totals = useMemo(() => {
    const sum = (k: TxKind) => periodTx.filter((t) => t.kind === k).reduce((a, b) => a + b.amount, 0);
    const receita = sum("receita");
    const despesa = sum("despesa") + sum("cartao");
    const investimento = sum("investimento") + sum("meta");
    const saldo = receita - despesa - investimento;
    const economia = receita > 0 ? (saldo / receita) * 100 : 0;
    return { receita, despesa, investimento, saldo, economia };
  }, [periodTx]);

  const [y, m] = ym.split("-").map(Number);
  const monthLabel = `${MONTHS[m - 1]} ${y}`;
  const periodLabel = view === "month" ? monthLabel : year;

  function changeMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function changeYear(delta: number) {
    setYear(String(parseInt(year, 10) + delta));
  }

  const greetingName = state.profile.name?.trim() || "você";

  return (
    <div className="min-h-screen pb-28">
      <Toaster position="top-center" richColors />

      <header className="px-5 pt-8 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5" />
              Myx+
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-1 truncate">
              Olá, <span className="text-gradient">{greetingName}</span>
            </h1>
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <div className="flex items-center rounded-full bg-card/80 backdrop-blur border p-0.5 text-[10px]">
              <button
                onClick={() => setView("month")}
                className={`px-2.5 py-1 rounded-full transition ${view === "month" ? "gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
              >Mês</button>
              <button
                onClick={() => setView("year")}
                className={`px-2.5 py-1 rounded-full transition ${view === "year" ? "gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
              >Ano</button>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-card/80 backdrop-blur px-2 py-1 border">
              <button onClick={() => view === "month" ? changeMonth(-1) : changeYear(-1)} className="w-6 h-6 rounded-full hover:bg-muted text-muted-foreground">‹</button>
              <span className="text-[11px] font-medium px-2 min-w-[100px] text-center">{periodLabel}</span>
              <button onClick={() => view === "month" ? changeMonth(1) : changeYear(1)} className="w-6 h-6 rounded-full hover:bg-muted text-muted-foreground">›</button>
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsContent value="dashboard" className="mt-0">
          <Dashboard totals={totals} periodTx={periodTx} cards={state.cards} goals={state.goals} periodLabel={periodLabel} />
        </TabsContent>

        <TabsContent value="transacoes" className="mt-0">
          <TransactionsTab periodTx={periodTx} state={state} ym={ym} />
        </TabsContent>
        <TabsContent value="cartoes" className="mt-0">
          <CardsTab state={state} />
        </TabsContent>
        <TabsContent value="investimentos" className="mt-0">
          <InvestmentsTab state={state} periodTx={periodTx} periodLabel={periodLabel} />
        </TabsContent>
        <TabsContent value="ajustes" className="mt-0">
          <SettingsTab state={state} />
        </TabsContent>

        <nav className="fixed bottom-0 inset-x-0 z-40">
          <div className="mx-auto max-w-md px-4 pb-4">
            <TabsList className="w-full h-16 bg-card/90 backdrop-blur-xl border shadow-card rounded-2xl p-1 grid grid-cols-5">
              <NavItem value="dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Início" />
              <NavItem value="transacoes" icon={<ArrowLeftRight className="w-5 h-5" />} label="Lançar" />
              <NavItem value="cartoes" icon={<CardIcon className="w-5 h-5" />} label="Cartões" />
              <NavItem value="investimentos" icon={<LineChart className="w-5 h-5" />} label="Invest." />
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

/* ---------- Alerts ---------- */
export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

type Alert = { id: string; severity: "warning" | "danger" | "info"; title: string; message: string };

function buildAlerts(cards: CreditCard[], goals: Goal[]): Alert[] {
  const alerts: Alert[] = [];
  for (const c of cards) {
    const pct = c.limit > 0 ? (c.used / c.limit) * 100 : 0;
    if (pct >= 100) {
      alerts.push({ id: `c-${c.id}-over`, severity: "danger", title: `${c.name}: limite excedido`, message: `${brl(c.used)} de ${brl(c.limit)} (${pct.toFixed(0)}%)` });
    } else if (pct >= 80) {
      alerts.push({ id: `c-${c.id}-near`, severity: "warning", title: `${c.name}: limite quase no fim`, message: `${pct.toFixed(0)}% utilizado · disponível ${brl(c.limit - c.used)}` });
    }
    const days = daysUntil(c.dueDate);
    if (c.status !== "Pago") {
      if (days < 0) {
        alerts.push({ id: `c-${c.id}-late`, severity: "danger", title: `${c.name}: fatura atrasada`, message: `Venceu há ${-days} dia(s)` });
      } else if (days <= 5) {
        alerts.push({ id: `c-${c.id}-soon`, severity: "warning", title: `${c.name}: vence em breve`, message: days === 0 ? "Vence hoje" : `Faltam ${days} dia(s) · ${brl(c.used)}` });
      }
    }
  }
  for (const g of goals) {
    const days = daysUntil(g.deadline);
    const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
    if (days < 0 && pct < 100) {
      alerts.push({ id: `g-${g.id}-late`, severity: "danger", title: `Meta "${g.name}" atrasada`, message: `${pct.toFixed(0)}% concluída · venceu há ${-days} dia(s)` });
    } else if (days <= 7 && pct < 100) {
      alerts.push({ id: `g-${g.id}-soon`, severity: "warning", title: `Meta "${g.name}" próxima do prazo`, message: `${pct.toFixed(0)}% · ${days === 0 ? "vence hoje" : `faltam ${days} dia(s)`} · restam ${brl(Math.max(g.target - g.saved, 0))}` });
    }
  }
  return alerts;
}

function AlertsCard({ cards, goals }: { cards: CreditCard[]; goals: Goal[] }) {
  const alerts = useMemo(() => buildAlerts(cards, goals), [cards, goals]);
  if (alerts.length === 0) return null;
  return (
    <Card className="p-4 border bg-card/80 backdrop-blur shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
          <Bell className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <h3 className="font-semibold text-sm">Alertas</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">{alerts.length}</Badge>
      </div>
      <div className="space-y-2">
        {alerts.map((a) => {
          const tone =
            a.severity === "danger"
              ? "bg-destructive/10 text-destructive border-destructive/30"
              : a.severity === "warning"
              ? "bg-warning/10 text-warning border-warning/30"
              : "bg-primary/10 text-primary-glow border-primary/30";
          const Icon = a.severity === "danger" ? AlertTriangle : a.severity === "warning" ? Clock : Bell;
          return (
            <div key={a.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${tone}`}>
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight">{a.title}</p>
                <p className="text-[11px] opacity-80 mt-0.5">{a.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Status Chip ---------- */
function StatusChip({ status, onToggle }: { status: Status; onToggle: () => void }) {
  const paid = status === "Pago";
  return (
    <button
      onClick={onToggle}
      title="Alternar status"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
        paid
          ? "bg-success/15 text-success border-success/30"
          : "bg-warning/15 text-warning border-warning/30"
      }`}
    >
      {paid ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {status}
    </button>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard({
  totals, periodTx, cards, goals, periodLabel,
}: {
  totals: { receita: number; despesa: number; investimento: number; saldo: number; economia: number };
  periodTx: Transaction[];
  cards: CreditCard[];
  goals: Goal[];
  periodLabel: string;
}) {
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    periodTx.filter((t) => t.kind === "despesa" || t.kind === "cartao").forEach((t) => {
      map.set(t.category || "Outros", (map.get(t.category || "Outros") || 0) + t.amount);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [periodTx]);

  const maxCat = byCategory[0]?.[1] || 1;

  const activeParcels = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of periodTx) {
      if (!t.parcelGroupId) continue;
      const arr = map.get(t.parcelGroupId) ?? [];
      arr.push(t);
      map.set(t.parcelGroupId, arr);
    }
    return Array.from(map.values());
  }, [periodTx]);

  return (
    <div className="px-5 space-y-4">
      <AlertsCard cards={cards} goals={goals} />

      {/* 1. Saldo do mês */}
      <Card className="gradient-primary border-0 text-primary-foreground p-5 shadow-glow overflow-hidden relative">
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-xs opacity-80">Saldo · {periodLabel}</p>
          <p className="text-4xl font-bold tracking-tight mt-1">{brl(totals.saldo)}</p>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
              {totals.economia.toFixed(1)}% economizado
            </Badge>
          </div>
        </div>
      </Card>

      {/* 2. Receita / Despesas / Investido */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Receita" value={totals.receita} tone="success" />
        <StatCard icon={<TrendingDown className="w-4 h-4" />} label="Despesas" value={totals.despesa} tone="destructive" />
        <StatCard icon={<PiggyBank className="w-4 h-4" />} label="Investido" value={totals.investimento} tone="primary" />
      </div>

      {/* 3. Cartões e parcelas */}
      {(cards.length > 0 || activeParcels.length > 0) && (
        <Card className="p-5 gradient-card border shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><CardIcon className="w-4 h-4 text-primary-glow" /> Cartões e parcelas</h3>
            {activeParcels.length > 0 && (
              <Badge variant="outline" className="text-[10px]">{activeParcels.length} parcelamento(s)</Badge>
            )}
          </div>
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
            {cards.length === 0 && <p className="text-xs text-muted-foreground">Nenhum cartão cadastrado.</p>}
          </div>
        </Card>
      )}

      {/* 4. Despesas por categoria */}
      <Card className="p-5 gradient-card border shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Despesas por categoria</h3>
          <span className="text-xs text-muted-foreground">{byCategory.length} categorias</span>
        </div>
        {byCategory.length === 0 ? (
          <EmptyHint text="Nenhuma despesa neste período" />
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

      {/* 5. Últimas movimentações */}
      <Card className="p-5 gradient-card border shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Últimas movimentações</h3>
        </div>
        {periodTx.length === 0 ? (
          <EmptyHint text="Sem lançamentos. Vá em Lançar para adicionar." />
        ) : (
          <div className="divide-y divide-border">
            {periodTx.slice(0, 5).map((t) => (
              <TxRow key={t.id} t={t} />
            ))}
          </div>
        )}
      </Card>
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

function kindIcon(k: TxKind) {
  if (k === "receita") return <TrendingUp className="w-4 h-4" />;
  if (k === "investimento" || k === "meta") return <PiggyBank className="w-4 h-4" />;
  if (k === "cartao") return <CardIcon className="w-4 h-4" />;
  return <TrendingDown className="w-4 h-4" />;
}
function kindToneClasses(k: TxKind) {
  if (k === "receita") return "bg-success/15 text-success";
  if (k === "investimento" || k === "meta") return "bg-primary/20 text-primary-glow";
  if (k === "cartao") return "bg-accent/20 text-accent-foreground";
  return "bg-destructive/15 text-destructive";
}

function TxRow({ t, onDelete }: { t: Transaction; onDelete?: () => void }) {
  const positive = t.kind === "receita";
  const showStatus = t.kind === "despesa" || t.kind === "cartao";
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kindToneClasses(t.kind)}`}>
        {kindIcon(t.kind)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {t.description || (t.kind === "meta" ? "Aporte em meta" : t.category)}
          {t.type === "Parcelado" && t.installments ? (
            <span className="ml-1.5 text-[10px] text-primary-glow font-normal">
              ({t.installment ?? "?"}/{t.installments})
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}
          {t.kind !== "receita" && t.category ? ` · ${t.category}` : ""} · {t.payment}
        </p>
      </div>
      <div className="text-right flex flex-col items-end gap-1">
        <p className={`text-sm font-semibold ${positive ? "text-success" : (t.kind === "investimento" || t.kind === "meta") ? "text-primary-glow" : "text-foreground"}`}>
          {positive ? "+" : "-"} {brl(t.amount)}
        </p>
        {showStatus && (
          <StatusChip
            status={t.status}
            onToggle={() => store.updateTransaction(t.id, { status: t.status === "Pago" ? "Pendente" : "Pago" })}
          />
        )}
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
  periodTx, state, ym,
}: { periodTx: Transaction[]; state: ReturnType<typeof useFinance>; ym: string }) {
  const [filter, setFilter] = useState<"todos" | TxKind>("todos");
  const filtered = filter === "todos" ? periodTx : periodTx.filter((t) => t.kind === filter);

  return (
    <div className="px-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lançamentos</h2>
        <NewTransactionDialog state={state} defaultDate={`${ym}-${String(new Date().getDate()).padStart(2, "0")}`} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["todos", "receita", "despesa", "investimento", "meta", "cartao"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`text-xs py-2 rounded-lg border transition-colors capitalize ${
              filter === k ? "gradient-primary text-primary-foreground border-transparent" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "cartao" ? "cartão" : k}
          </button>
        ))}
      </div>

      <ParcelGroupsCard transactions={state.transactions} />

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

function ParcelGroupsCard({ transactions }: { transactions: Transaction[] }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (!t.parcelGroupId) continue;
      const arr = map.get(t.parcelGroupId) ?? [];
      arr.push(t);
      map.set(t.parcelGroupId, arr);
    }
    return Array.from(map.entries())
      .map(([id, items]) => {
        const sorted = [...items].sort((a, b) => (a.installment ?? 0) - (b.installment ?? 0));
        const first = sorted[0];
        const paid = sorted.filter((t) => t.status === "Pago").length;
        const total = first?.installments ?? sorted.length;
        const totalValue = sorted.reduce((a, b) => a + b.amount, 0);
        const nextPending = sorted.find((t) => t.status === "Pendente");
        return { id, items: sorted, first, paid, total, totalValue, nextPending };
      })
      .sort((a, b) => (a.nextPending?.date ?? "9").localeCompare(b.nextPending?.date ?? "9"));
  }, [transactions]);

  if (groups.length === 0) return null;

  return (
    <Card className="p-4 gradient-card border shadow-card">
      <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary-glow" /> Parcelamentos
      </h3>
      <div className="space-y-3">
        {groups.map((g) => {
          const pct = g.total > 0 ? (g.paid / g.total) * 100 : 0;
          const isOpen = openGroup === g.id;
          return (
            <div key={g.id} className="rounded-lg border p-3">
              <button onClick={() => setOpenGroup(isOpen ? null : g.id)} className="w-full flex items-start justify-between gap-2 text-left">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{g.first?.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {g.paid}/{g.total} parcelas pagas · total {brl(g.totalValue)}
                    {g.nextPending ? ` · próx ${new Date(g.nextPending.date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{isOpen ? "Fechar" : "Ver"}</Badge>
              </button>
              <Progress value={pct} className="h-1.5 mt-2" />
              {isOpen && (
                <div className="mt-3 space-y-1.5 border-t pt-3">
                  {g.items.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-primary-glow">{t.installment}/{t.installments}</span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")} · {brl(t.amount)}
                        </span>
                      </div>
                      <StatusChip
                        status={t.status}
                        onToggle={() => store.updateTransaction(t.id, { status: t.status === "Pago" ? "Pendente" : "Pago" })}
                      />
                      <button onClick={() => { store.removeTransaction(t.id); toast.success("Parcela removida"); }} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm(`Remover todas as ${g.items.length} parcelas?`)) {
                        store.removeParcelGroup(g.id);
                        setOpenGroup(null);
                        toast.success("Parcelamento removido");
                      }
                    }}
                  >
                    Remover parcelamento
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NewTransactionDialog({ state, defaultDate }: { state: ReturnType<typeof useFinance>; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Transaction, "id">>({
    date: defaultDate,
    description: "",
    kind: "despesa",
    type: "Variável",
    category: state.lists.categories[0] ?? "Outros",
    payment: state.lists.payments[0] ?? "Pix",
    status: "Pago",
    amount: 0,
  });

  function setKind(k: TxKind) {
    setForm((f) => {
      const next: Omit<Transaction, "id"> = { ...f, kind: k };
      if (k === "receita") {
        next.category = "";
        next.type = "Fixo";
      } else if (k === "despesa") {
        next.category = state.lists.categories[0] ?? "Outros";
        next.type = "Variável";
      } else if (k === "investimento") {
        next.category = state.lists.investmentCategories[0] ?? "Outros";
        next.type = "Variável";
      } else if (k === "meta") {
        next.goalId = state.goals[0]?.id;
        next.category = state.goals[0]?.name ?? "";
        next.type = "Variável";
        next.status = "Pago";
      } else if (k === "cartao") {
        next.cardId = state.cards[0]?.id;
        next.category = state.lists.categories[0] ?? "Outros";
        next.type = "À vista";
        next.payment = state.cards[0]?.name ?? next.payment;
      }
      return next;
    });
  }

  function submit() {
    if (!form.amount) {
      toast.error("Informe o valor");
      return;
    }
    if (form.kind === "meta" && !form.goalId) {
      toast.error("Selecione ou crie uma meta primeiro");
      return;
    }
    if (form.kind === "cartao" && !form.cardId) {
      toast.error("Selecione ou crie um cartão primeiro");
      return;
    }
    if (form.kind !== "meta" && !form.description.trim()) {
      toast.error("Informe a descrição");
      return;
    }
    store.addTransaction(form);
    toast.success("Lançamento adicionado");
    setOpen(false);
    setForm({ ...form, description: "", amount: 0, installment: undefined, installments: undefined });
  }

  const categoryOptions =
    form.kind === "investimento" ? state.lists.investmentCategories : state.lists.categories;
  const showCategory = form.kind === "despesa" || form.kind === "investimento" || form.kind === "cartao";
  const showStatus = form.kind === "despesa" || form.kind === "cartao";
  const showInstallments = (form.kind === "despesa" || form.kind === "cartao") && form.type === "Parcelado";

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
            <Select value={form.kind} onValueChange={(v) => setKind(v as TxKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="investimento">Investimento</SelectItem>
                <SelectItem value="meta">Meta</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>

          {form.kind === "meta" ? (
            <Field label="Meta" className="col-span-2">
              {state.goals.length === 0 ? (
                <p className="text-xs text-muted-foreground">Crie uma meta na aba Invest. primeiro.</p>
              ) : (
                <Select
                  value={form.goalId ?? ""}
                  onValueChange={(v) => {
                    const g = state.goals.find((x) => x.id === v);
                    setForm({ ...form, goalId: v, category: g?.name ?? "", description: form.description || `Aporte em ${g?.name ?? ""}` });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar meta" /></SelectTrigger>
                  <SelectContent>
                    {state.goals.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </Field>
          ) : (
            <Field label="Descrição" className="col-span-2">
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Mercado" />
            </Field>
          )}

          <Field label="Valor">
            <Input type="number" inputMode="decimal" step="0.01" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
          </Field>

          {form.kind === "cartao" && (
            <Field label="Cartão">
              {state.cards.length === 0 ? (
                <p className="text-xs text-muted-foreground">Cadastre um cartão.</p>
              ) : (
                <Select
                  value={form.cardId ?? ""}
                  onValueChange={(v) => {
                    const c = state.cards.find((x) => x.id === v);
                    setForm({ ...form, cardId: v, payment: c?.name ?? form.payment });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {state.cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </Field>
          )}

          {showCategory && (
            <Field label="Categoria">
              <SelectFromList value={form.category} options={categoryOptions} onChange={(v) => setForm({ ...form, category: v })} />
            </Field>
          )}

          {form.kind !== "cartao" && form.kind !== "meta" && (
            <Field label="Forma de pagamento">
              <SelectFromList value={form.payment} options={state.lists.payments} onChange={(v) => setForm({ ...form, payment: v })} />
            </Field>
          )}

          {(form.kind === "despesa" || form.kind === "cartao") && (
            <Field label="Recorrência">
              <SelectFromList value={form.type} options={state.lists.types} onChange={(v) => setForm({ ...form, type: v })} />
            </Field>
          )}

          {showInstallments && (
            <>
              <Field label="Parcela atual">
                <Input type="number" inputMode="numeric" min={1} value={form.installment || ""} onChange={(e) => setForm({ ...form, installment: parseInt(e.target.value) || undefined })} placeholder="Ex: 2" />
              </Field>
              <Field label="Total de parcelas">
                <Input type="number" inputMode="numeric" min={1} value={form.installments || ""} onChange={(e) => setForm({ ...form, installments: parseInt(e.target.value) || undefined })} placeholder="Ex: 12" />
              </Field>
            </>
          )}

          {showStatus && (
            <Field label="Status" className="col-span-2">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.lists.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
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
                    <StatusChip
                      status={c.status}
                      onToggle={() => store.updateCard(c.id, { status: c.status === "Pago" ? "Pendente" : "Pago" })}
                    />
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
const THEMES: { key: ThemeName; label: string; swatch: string }[] = [
  { key: "light", label: "Claro", swatch: "#f8f7fb" },
  { key: "dark", label: "Escuro", swatch: "#221a3a" },
  { key: "pink", label: "Rosa pastel", swatch: "#f9d4e0" },
  { key: "purple", label: "Roxo pastel", swatch: "#e0d4f9" },
  { key: "blue", label: "Azul pastel", swatch: "#d4e3f9" },
  { key: "green", label: "Verde pastel", swatch: "#d4f9e3" },
  { key: "orange", label: "Laranja pastel", swatch: "#fce5cd" },
];

function SettingsTab({ state }: { state: ReturnType<typeof useFinance> }) {
  const [name, setName] = useState(state.profile.name);
  useEffect(() => { setName(state.profile.name); }, [state.profile.name]);

  const groups: { key: keyof typeof state.lists; label: string }[] = [
    { key: "categories", label: "Categorias de despesa" },
    { key: "investmentCategories", label: "Categorias de investimento" },
    { key: "payments", label: "Formas de pagamento" },
    { key: "cards", label: "Cartões" },
    { key: "types", label: "Recorrências" },
  ];

  return (
    <div className="px-5 space-y-4">
      <h2 className="text-lg font-semibold">Ajustes</h2>

      {/* Perfil */}
      <Card className="p-4 gradient-card border shadow-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary-glow" /> Perfil</h3>
        <Field label="Seu nome">
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Manu" />
            <Button
              className="gradient-primary text-primary-foreground border-0"
              onClick={() => { store.setProfile({ name: name.trim() }); toast.success("Perfil salvo"); }}
            >Salvar</Button>
          </div>
        </Field>
      </Card>

      {/* Tema */}
      <Card className="p-4 gradient-card border shadow-card">
        <h3 className="font-semibold mb-3">Tema</h3>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const active = state.theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { store.setTheme(t.key); toast.success(`Tema: ${t.label}`); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                  active ? "gradient-primary text-primary-foreground border-transparent shadow-glow" : "bg-card hover:bg-muted"
                }`}
              >
                <span className="w-5 h-5 rounded-full border" style={{ background: t.swatch }} />
                <span className="text-xs">{t.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {groups.map((g) => (
        <ListEditor
          key={g.key}
          label={g.label}
          values={state.lists[g.key] as string[]}
          onChange={(vals) => store.updateList(g.key as never, vals as never)}
        />
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

/* ---------- Goals ---------- */
function GoalsManager({ goals }: { goals: Goal[] }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Omit<Goal, "id">>({ name: "", target: 0, saved: 0, deadline: today });

  function submit() {
    if (!form.name.trim() || !form.target) { toast.error("Preencha nome e valor da meta"); return; }
    store.addGoal(form);
    toast.success("Meta criada");
    setOpen(false);
    setForm({ name: "", target: 0, saved: 0, deadline: today });
  }

  return (
    <Card className="p-4 gradient-card border shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-primary-glow" /> Metas</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Meta</Button>
          </DialogTrigger>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome" className="col-span-2">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Viagem" />
              </Field>
              <Field label="Valor alvo">
                <Input type="number" inputMode="decimal" value={form.target || ""} onChange={(e) => setForm({ ...form, target: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label="Já guardado">
                <Input type="number" inputMode="decimal" value={form.saved || ""} onChange={(e) => setForm({ ...form, saved: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label="Prazo" className="col-span-2">
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </Field>
            </div>
            <DialogFooter>
              <Button onClick={submit} className="gradient-primary text-primary-foreground border-0 w-full">Salvar meta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {goals.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma meta cadastrada.</p>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
            const days = daysUntil(g.deadline);
            return (
              <div key={g.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{g.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Prazo {new Date(g.deadline + "T00:00:00").toLocaleDateString("pt-BR")} ·{" "}
                      {days < 0 ? `atrasada ${-days}d` : days === 0 ? "vence hoje" : `faltam ${days}d`}
                    </p>
                  </div>
                  <button onClick={() => store.removeGoal(g.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{brl(g.saved)} / {brl(g.target)}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="Adicionar aporte (Enter)"
                      className="h-8 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = parseFloat((e.target as HTMLInputElement).value) || 0;
                          if (v) {
                            store.updateGoal(g.id, { saved: g.saved + v });
                            (e.target as HTMLInputElement).value = "";
                            toast.success("Meta atualizada");
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ---------- Investments ---------- */
function InvestmentsTab({ state, periodTx, periodLabel }: { state: ReturnType<typeof useFinance>; periodTx: Transaction[]; periodLabel: string }) {
  const allInv = useMemo(
    () => state.transactions.filter((t) => t.kind === "investimento"),
    [state.transactions],
  );
  const periodInv = useMemo(() => periodTx.filter((t) => t.kind === "investimento"), [periodTx]);

  const totalAll = allInv.reduce((a, b) => a + b.amount, 0);
  const totalPeriod = periodInv.reduce((a, b) => a + b.amount, 0);

  const sortedInv = useMemo(
    () => [...allInv].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allInv],
  );

  return (
    <div className="px-5 space-y-4">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 gradient-card border shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PiggyBank className="w-3.5 h-3.5" /> Total investido
          </div>
          <p className="text-xl font-bold mt-1 text-primary-glow">{brl(totalAll)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{allInv.length} aporte(s)</p>
        </Card>
        <Card className="p-4 gradient-card border shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5" /> Em {periodLabel}
          </div>
          <p className="text-xl font-bold mt-1">{brl(totalPeriod)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{periodInv.length} aporte(s)</p>
        </Card>
      </div>

      {/* Metas */}
      <GoalsManager goals={state.goals} />

      {/* Investimentos */}
      <Card className="p-4 gradient-card border shadow-card">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <LineChart className="w-4 h-4 text-primary-glow" /> Investimentos
        </h3>
        {sortedInv.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum investimento ainda. Use Lançar → Investimento para adicionar.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedInv.map((t) => (
              <div key={t.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.description || t.category}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.category} · {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-primary-glow">{brl(t.amount)}</p>
                    <button onClick={() => { store.removeTransaction(t.id); toast.success("Removido"); }} className="text-muted-foreground hover:text-destructive mt-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

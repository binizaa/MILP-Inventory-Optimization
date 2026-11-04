var { useState, useEffect, useMemo, useCallback } = React;

const TITLES = {
  dashboard:  { eyebrow: "Inicio",        title: "Panel de cocina — Casa Monarca",              subtitle: "Resumen de la semana, lista de compras y asistencia." },
  recipes:    { eyebrow: "Sección 1 / 5", title: "Registro de recetas y materia prima",         subtitle: "Da de alta los platillos del menú y desglosa sus ingredientes por porción mediana." },
  inventory:  { eyebrow: "Sección 2 / 5", title: "Control de inventario",                       subtitle: "Stock actual de la cocina y la bodega, organizado por ubicación." },
  attendance: { eyebrow: "Sección 3 / 5", title: "Registro de asistencia",                      subtitle: "Personas presentes hoy, desglosadas por tamaño de porción." },
  purchases:  { eyebrow: "Sección 4 / 5", title: "Módulo de compras sugeridas",                 subtitle: "Cruce dinámico entre asistencia, recetas e inventario. Se recalcula al instante." },
  supermarkets: { eyebrow: "Sección 5 / 5", title: "Supermercados",                             subtitle: "Proveedores y precios de referencia para las compras." },
};

const App = () => {
  const [tab, setTab] = useState("dashboard");
  const [recipes, setRecipes]     = useState(window.INITIAL_RECIPES);
  const [inventory, setInventory] = useState(window.INITIAL_INVENTORY);
  const [people, setPeople]       = useState([]);
  const [dbReady, setDbReady]         = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [toast, setToast]             = useState(null);
  const [userLocation, setUserLocation] = useState(null); // { lat, lng, accuracy, timestamp }

  useEffect(() => {
    // Remove the static HTML splash once React has mounted
    const el = document.getElementById("cm-splash-static");
    if (el) el.remove();
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    const t = setTimeout(() => setSplashVisible(false), 450);
    return () => clearTimeout(t);
  }, [dbReady]);

  // Attendance is derived — people who have arrived and not yet departed
  const appliedAttendance = useMemo(() => {
    const present = people.filter(p => p.arrival && !p.departure);
    return {
      chicas:   present.filter(p => p.portion_type === 'S').length,
      medianas: present.filter(p => p.portion_type === 'M').length,
      grandes:  present.filter(p => p.portion_type === 'L').length,
    };
  }, [people]);

  // Expose for RecipesView live preview
  useEffect(() => { window._att = appliedAttendance; }, [appliedAttendance]);

  // Toasts auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const onToast = useCallback((msg, kind = "ok") => setToast({ msg, kind }), []);

  // ── DB load on mount ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!window.electronAPI) { setDbReady(true); return; }
    window.electronAPI.dbLoad().then(data => {
      if (data) {
        if (data.inventory.length > 0) setInventory(data.inventory);
        if (data.recipes.length > 0)   setRecipes(data.recipes);
        if (data.people.length > 0)    setPeople(data.people);
      }
      setDbReady(true);
    }).catch(err => {
      console.error("db:load error", err);
      setDbReady(true);
    });
  }, []);

  // ── Persist inventory + recipes whenever they change ──────────────────────

  useEffect(() => {
    if (!dbReady || !window.electronAPI) return;
    window.electronAPI.dbSave(inventory, recipes);
  }, [inventory, recipes, dbReady]);

  // ── People handlers (each persists to DB individually) ───────────────────

  const handleCheckin = useCallback(async (id) => {
    const now = new Date().toISOString();
    setPeople(prev => prev.map(p => p.id === id ? { ...p, arrival: now, departure: null } : p));
    await window.electronAPI?.dbCheckin(id);
    onToast("Entrada registrada");
  }, [onToast]);

  const handleCheckout = useCallback(async (id) => {
    const now = new Date().toISOString();
    setPeople(prev => prev.map(p => p.id === id ? { ...p, departure: now } : p));
    await window.electronAPI?.dbCheckout(id);
    onToast("Salida registrada");
  }, [onToast]);

  const handleAddPerson = useCallback(async (person) => {
    const result = await window.electronAPI?.dbAddPerson(person);
    const newId = result?.id ?? Date.now();
    setPeople(prev => [...prev, { ...person, id: newId, arrival: new Date().toISOString(), departure: null }]);
    onToast(`${person.name} agregada/o`);
  }, [onToast]);

  const handleDeletePerson = useCallback(async (id) => {
    setPeople(prev => prev.filter(p => p.id !== id));
    await window.electronAPI?.dbDeletePerson(id);
  }, []);

  // ── Sidebar badges ────────────────────────────────────────────────────────

  const lowStockCount = useMemo(() => {
    const demand = window.CM.computeDemand(recipes, appliedAttendance);
    return inventory.filter(row => {
      const need = demand[row.id]?.needed;
      return need != null && row.qty < need * 0.7;
    }).length;
  }, [inventory, recipes, appliedAttendance]);

  const shoppingCount = useMemo(() => {
    return window.CM.computeShoppingList(recipes, inventory, appliedAttendance)
      .filter(r => r.status === "comprar").length;
  }, [recipes, inventory, appliedAttendance]);

  const t = TITLES[tab];

  return (
    <>
      {splashVisible && (
        <div className={`cm-splash${dbReady ? " cm-splash--hidden" : ""}`}>
          <img className="cm-splash__logo" src="assets/logo-casamonarca.png" alt="Casa Monarca" />
          <div className="cm-splash__title">Cocina <em>Casa Monarca</em></div>
          <div className="cm-splash__bar"></div>
          <div className="cm-splash__sub">Cargando datos…</div>
        </div>
      )}
    <div className="cm-app">
      <Sidebar
        current={tab}
        onNavigate={setTab}
        recipeCount={recipes.length}
        lowStockCount={lowStockCount}
        shoppingCount={shoppingCount}
      />
      <main className="cm-main">
        <div className="cm-topbar">
          <div>
            <div className="cm-eyebrow">{t.eyebrow}</div>
            <h1 style={{ marginTop: 6 }}>
              {tab === "dashboard"  && <>Panel de <em>cocina</em></>}
              {tab === "recipes"    && <>Recetas <em>y materia prima</em></>}
              {tab === "inventory"  && <>Inventario <em>actual</em></>}
              {tab === "attendance" && <>Asistencia <em>del día</em></>}
              {tab === "purchases"  && <>Compras <em>sugeridas</em></>}
              {tab === "supermarkets" && <>Super<em>mercados</em></>}
            </h1>
            <p>{t.subtitle}</p>
          </div>
          {/* <div className="cm-week-pill">
            <span className="dot"></span>
            <div>
              <div className="lbl" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Ciclo activo
              </div>
              <strong>Semana 22 · 2026</strong>
            </div>
            <span style={{ width: 1, height: 24, background: "var(--cm-border)" }}></span>
            <div>
              <div className="lbl" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Presentes
              </div>
              <strong>{window.CM.totalPeople(appliedAttendance)}</strong>
            </div>
          </div> */}
        </div>

        {tab === "dashboard" && (
          <DashboardView
            recipes={recipes}
            inventory={inventory}
            attendance={appliedAttendance}
            onNavigate={setTab}
          />
        )}
        {tab === "recipes" && (
          <RecipesView
            recipes={recipes}
            setRecipes={setRecipes}
            inventory={inventory}
            setInventory={setInventory}
            onToast={onToast}
          />
        )}
        {tab === "inventory" && (
          <InventoryView
            inventory={inventory}
            setInventory={setInventory}
            recipes={recipes}
            attendance={appliedAttendance}
            onToast={onToast}
          />
        )}
        {tab === "attendance" && (
          <AttendanceView
            people={people}
            attendance={appliedAttendance}
            onCheckin={handleCheckin}
            onCheckout={handleCheckout}
            onAddPerson={handleAddPerson}
            onDeletePerson={handleDeletePerson}
            onToast={onToast}
          />
        )}
        {tab === "purchases" && (
          <PurchasesView
            recipes={recipes}
            inventory={inventory}
            attendance={appliedAttendance}
            recomputeKey={0}
          />
        )}
        {tab === "supermarkets" && <SupermarketsView onLocation={setUserLocation} />}
      </main>

      {toast && (
        <div className="cm-toast">
          <Icon name="check" size={14} />
          {toast.msg}
        </div>
      )}
    </div>
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

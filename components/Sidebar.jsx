var { useState } = React;

const Sidebar = ({ current, onNavigate, recipeCount, lowStockCount, shoppingCount }) => {
  const items = [
    { id: "dashboard",  label: "Inicio",            icon: "home" },
    { id: "recipes",    label: "Recetas",           icon: "book", badge: recipeCount },
    { id: "inventory",  label: "Inventario",        icon: "box",  badge: lowStockCount, badgeKind: lowStockCount > 0 ? "alert" : null },
    { id: "attendance", label: "Asistencia semanal", icon: "users" },
    { id: "purchases",  label: "Compras sugeridas", icon: "cart", badge: shoppingCount, badgeKind: shoppingCount > 0 ? "alert" : null },
    { id: "supermarkets", label: "Supermercados",   icon: "store" },
  ];
  return (
    <aside className="cm-sidebar">
      <div className="cm-brand">
        <div className="cm-brand-mark">
          <img src="assets/logo-casamonarca.png" alt="Casa Monarca" />
        </div>
        <div className="cm-brand-name">
          Cocina
          <em>Casa Monarca</em>
        </div>
      </div>

      <div className="cm-nav-label">Operación</div>
      {items.map((it) => (
        <button
          key={it.id}
          className={"cm-nav-item" + (current === it.id ? " is-active" : "")}
          onClick={() => onNavigate(it.id)}
        >
          <span className="cm-nav-ico"><Icon name={it.icon} size={17} /></span>
          {it.label}
          {it.badge != null && it.badge !== 0 && (
            <span className="cm-nav-badge">{it.badge}</span>
          )}
        </button>
      ))}

      <div className="cm-nav-label" style={{ marginTop: 18 }}>Ciclo</div>
      <div style={{
        padding: "12px 12px 14px",
        borderRadius: 10,
        background: "#2A1F19",
        color: "#D4C9BB",
        fontSize: 12.5,
        lineHeight: 1.55,
      }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "#fff", letterSpacing: "-0.01em" }}>
          Semana 22
        </div>
        <div style={{ marginTop: 4, color: "#8C7E72" }}>25 — 31 mayo, 2026</div>
        <div style={{
          marginTop: 10, fontSize: 11, color: "#8C7E72",
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          Próximo corte
        </div>
        <div style={{ fontFamily: "var(--font-mono)", color: "#FBE9CB", marginTop: 2 }}>
          Domingo · 23:59
        </div>
      </div>

      {/* <div className="cm-sidebar-foot">
        <div className="av">LR</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 600 }}>Lupita Robles</div>
          <div>Coordinadora cocina</div>
        </div>
      </div> */}
    </aside>
  );
};

window.Sidebar = Sidebar;

var { useState } = React;

const SupermarketsView = ({ onLocation }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const requestLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const loc = await window.CMLocation.getDeviceLocation();
      setLocation(loc);
      onLocation?.(loc);
    } catch (err) {
      setError(err?.message || "No se pudo obtener la ubicación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cm-card">
      <div className="cm-card-head">
        <div>
          <h2>Supermercados</h2>
          <div className="desc">Comparte la ubicación del equipo para buscar supermercados cercanos.</div>
        </div>
        <button className="cm-btn primary" onClick={requestLocation} disabled={loading}>
          <Icon name="pin" size={15} />
          {loading ? "Obteniendo ubicación…" : "Enviar mi ubicación"}
        </button>
      </div>

      {error && (
        <div style={{ color: "var(--cm-danger, #b42318)", fontSize: 13 }}>{error}</div>
      )}

      {location && (
        <div className="mono" style={{ fontSize: 13, color: "var(--cm-text-2)", lineHeight: 1.7 }}>
          <div>Latitud: {location.lat.toFixed(6)}</div>
          <div>Longitud: {location.lng.toFixed(6)}</div>
        </div>
      )}
    </div>
  );
};

window.SupermarketsView = SupermarketsView;

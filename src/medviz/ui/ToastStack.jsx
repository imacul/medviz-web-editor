const ToastStack = ({ toasts }) => {
  return (
    <div style={{ position: 'absolute', top: '76px', right: '16px', zIndex: 500, display: 'grid', gap: '8px' }}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{ minWidth: '220px', maxWidth: '340px', background: 'rgba(20,25,40,0.92)', color: '#f3f7ff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 12px', fontSize: '12px' }}>
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default ToastStack;

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#f9f9f9' }}>
        {children}
      </body>
    </html>
  );
}

export default function Home() {
  return (
    <main className="homepage">
      <iframe
        className="homepage__frame homepage__frame--desktop"
        src="/schoolai-homepage.html"
        title="AI 360° homepage"
      />
      <iframe
        className="homepage__frame homepage__frame--mobile"
        src="/mobile-homepage.html"
        title="AI 360° mobile homepage"
      />
    </main>
  );
}

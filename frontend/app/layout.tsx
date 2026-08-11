import "./globals.css";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "HTC Insights — ประสบการณ์จริง จากรุ่นพี่ตัวจริง",
  description: "คลังข้อมูลรีวิวสถานประกอบการ ประกาศงานฝึกงาน และชุมชนแลกเปลี่ยนประสบการณ์สำหรับนักศึกษาวิทยาลัยเทคนิคหาดใหญ่",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-background text-on-surface antialiased min-h-screen">
        <Navbar />
        <main className="pt-16 pb-20 md:pb-8 min-h-screen">
          {children}
        </main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}


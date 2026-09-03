import LoadingScreen from "@/components/LoadingScreen";

export default function Loading() {
  return (
    <LoadingScreen
      message="กำลังโหลดหน้าเว็บ..."
      subMessage="HTC Insights กำลังจัดเตรียมข้อมูลให้คุณ กรุณารอสักครู่"
      minHeight="min-h-[75vh]"
      size="lg"
    />
  );
}

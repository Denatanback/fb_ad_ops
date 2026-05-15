export function FlashMessage({
  tone,
  message
}: Readonly<{
  tone: "success" | "error";
  message: string;
}>) {
  return <div className={`flash-message flash-message--${tone}`}>{message}</div>;
}

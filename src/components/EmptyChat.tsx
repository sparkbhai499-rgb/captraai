import { MessageCircle } from "lucide-react";

const EmptyChat = () => (
  <div className="flex-1 flex flex-col items-center justify-center chat-pattern">
    <div className="bg-card rounded-3xl p-10 shadow-lg flex flex-col items-center gap-4 max-w-sm text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageCircle className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground">W8sap</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Apne doston aur family se baat karo. Chat shuru karne ke liye left side se koi contact select karo.
      </p>
    </div>
  </div>
);

export default EmptyChat;

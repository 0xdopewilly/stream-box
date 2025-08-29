import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";

export function WalletButton() {
  const { isConnected, shortAddress, isConnecting, connectWallet, disconnectWallet } = useWallet();

  const handleClick = () => {
    if (isConnected) {
      disconnectWallet();
    } else {
      connectWallet();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isConnecting}
      className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium flex items-center space-x-2"
      data-testid="wallet-button"
    >
      <Wallet className="h-4 w-4" />
      <span>
        {isConnecting 
          ? "Connecting..." 
          : isConnected 
            ? shortAddress 
            : "Connect Wallet"
        }
      </span>
    </Button>
  );
}

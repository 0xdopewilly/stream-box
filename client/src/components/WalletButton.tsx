import { Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/contexts/WalletContext";

export function WalletButton() {
  const { isConnected, shortAddress, isConnecting, connectWallet, disconnectWallet, balance, isFilecoinNetwork } = useWallet();

  if (!isConnected) {
    return (
      <Button
        onClick={connectWallet}
        disabled={isConnecting}
        className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium flex items-center space-x-2"
        data-testid="wallet-button"
      >
        <Wallet className="h-4 w-4" />
        <span>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="bg-green-600 hover:bg-green-700 text-white font-medium flex items-center space-x-2"
          data-testid="wallet-connected-button"
        >
          <Wallet className="h-4 w-4" />
          <span>{shortAddress}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Wallet Connected</span>
            {isFilecoinNetwork ? (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                Filecoin
              </Badge>
            ) : (
              <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                Wrong Network
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {shortAddress}
          </div>
          {balance && (
            <div className="text-xs text-muted-foreground">
              Balance: {balance} {isFilecoinNetwork ? 'tFIL' : 'FIL'}
            </div>
          )}
        </div>
        <DropdownMenuItem
          onClick={disconnectWallet}
          className="text-red-600 focus:text-red-600 cursor-pointer"
          data-testid="disconnect-wallet-button"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect Wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

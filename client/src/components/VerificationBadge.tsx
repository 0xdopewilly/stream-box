import { Shield, ShieldCheck, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerificationBadgeProps {
  isVerified: boolean;
  filecoinHash?: string;
  filecoinCid?: string;
  className?: string;
  showText?: boolean;
}

export function VerificationBadge({ 
  isVerified, 
  filecoinHash, 
  filecoinCid, 
  className = "",
  showText = true 
}: VerificationBadgeProps) {
  const verified = isVerified && filecoinHash;
  
  const badgeContent = (
    <Badge 
      variant={verified ? "default" : "secondary"} 
      className={`flex items-center gap-1 ${className}`}
      data-testid={verified ? "verified-badge" : "unverified-badge"}
    >
      {verified ? (
        <ShieldCheck className="w-3 h-3 text-green-500" />
      ) : filecoinHash ? (
        <ShieldX className="w-3 h-3 text-orange-500" />
      ) : (
        <Shield className="w-3 h-3 text-gray-500" />
      )}
      {showText && (
        <span className="text-xs">
          {verified ? "PDP Verified" : filecoinHash ? "Verification Pending" : "Not Verified"}
        </span>
      )}
    </Badge>
  );

  const tooltipText = verified 
    ? `Content verified on Filecoin network with PDP proof. Hash: ${filecoinHash?.slice(0, 10)}...${filecoinCid ? ` CID: ${filecoinCid.slice(0, 10)}...` : ''}`
    : filecoinHash 
    ? `Content stored on Filecoin but PDP verification is pending. Hash: ${filecoinHash.slice(0, 10)}...`
    : "Content not verified on decentralized storage";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm max-w-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
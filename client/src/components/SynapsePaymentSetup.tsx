import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, Circle, Loader2, Wallet, Shield, Upload } from 'lucide-react';
import { useSynapsePayment } from '@/hooks/useSynapsePayment';
import { ethers } from 'ethers';

interface SynapsePaymentSetupProps {
  onComplete: () => void;
  estimatedFileSize?: number;
}

export function SynapsePaymentSetup({ onComplete, estimatedFileSize = 100 * 1024 * 1024 }: SynapsePaymentSetupProps) {
  const [currentStep, setCurrentStep] = useState<'deposit' | 'approve' | 'done'>('deposit');
  const { depositTokens, approveService, isProcessing, status, error } = useSynapsePayment();

  // Calculate amounts based on file size
  const depositAmount = ethers.parseUnits("100", 18); // 100 USDFC
  const rateAllowance = ethers.parseUnits("10", 18); // 10 USDFC per epoch
  const lockupAllowance = ethers.parseUnits("1000", 18); // 1000 USDFC total

  const handleDeposit = async () => {
    const result = await depositTokens(depositAmount.toString());
    if (result.success) {
      setCurrentStep('approve');
    }
  };

  const handleApprove = async () => {
    const result = await approveService(rateAllowance.toString(), lockupAllowance.toString());
    if (result.success) {
      setCurrentStep('done');
      onComplete();
    }
  };

  const steps = [
    {
      id: 'deposit',
      title: 'Deposit USDFC Tokens',
      description: 'Deposit tokens for storage payments',
      icon: Wallet,
      amount: '100 USDFC',
      completed: status.deposited
    },
    {
      id: 'approve',
      title: 'Approve Storage Service',
      description: 'Allow WarmStorage to use your tokens',
      icon: Shield,
      amount: '10 USDFC rate + 1000 USDFC lockup',
      completed: status.approved
    },
    {
      id: 'upload',
      title: 'Ready to Upload',
      description: 'Your payment setup is complete',
      icon: Upload,
      amount: 'FilCDN + WarmStorage enabled',
      completed: status.ready
    }
  ];

  return (
    <Card className="p-6" data-testid="payment-setup-card">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Filecoin Storage Payment Setup</h3>
        <p className="text-muted-foreground text-sm">
          Complete these steps to enable decentralized storage with WarmStorage and FilCDN via Synapse SDK
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = step.id === currentStep;
          const isPending = !step.completed && !isActive;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                isActive ? 'border-primary bg-primary/5' : 
                step.completed ? 'border-green-500/30 bg-green-500/5' :
                'border-border'
              }`}
              data-testid={`step-${step.id}`}
            >
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                step.completed ? 'bg-green-500' :
                isActive ? 'bg-primary' :
                'bg-muted'
              }`}>
                {step.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : isActive && isProcessing ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <StepIcon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold">{step.title}</h4>
                  {step.completed && (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                      Complete
                    </Badge>
                  )}
                  {isActive && !step.completed && (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Action Required
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                <div className="text-sm font-mono text-muted-foreground">{step.amount}</div>

                {isActive && !step.completed && (
                  <div className="mt-3">
                    {step.id === 'deposit' && (
                      <Button
                        onClick={handleDeposit}
                        disabled={isProcessing}
                        className="w-full sm:w-auto"
                        data-testid="button-deposit"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Wallet className="w-4 h-4 mr-2" />
                            Deposit {ethers.formatUnits(depositAmount, 18)} USDFC
                          </>
                        )}
                      </Button>
                    )}
                    {step.id === 'approve' && (
                      <Button
                        onClick={handleApprove}
                        disabled={isProcessing}
                        className="w-full sm:w-auto"
                        data-testid="button-approve"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Approve Storage Service
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {status.ready && (
        <Alert className="mt-6 border-green-500/50 bg-green-500/5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500">
            ✓ Payment setup complete! You're ready to upload to Filecoin WarmStorage with FilCDN optimization.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 space-y-3">
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-sm">
            <strong className="text-red-600 dark:text-red-400">SDK Configuration Issue:</strong> The Synapse SDK's hardcoded USDFC contract address (<code>0xb3042734...cDf0</code>) doesn't exist on Calibration network.
            <br /><br />
            <strong>Correct USDFC Contract:</strong> <code className="text-xs">0x80b98d3aa09ffff255c3ba4a241111ff1262f045</code>
            <br />
            <strong>Get Test USDFC:</strong> <a href="https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc" target="_blank" rel="noopener noreferrer" className="underline text-blue-500">Calibration USDFC Faucet</a>
            <br /><br />
            Until the SDK is updated, you can skip payment setup and proceed directly to upload.
          </AlertDescription>
        </Alert>

        <Button
          onClick={onComplete}
          variant="outline"
          className="w-full"
          data-testid="button-skip-payment"
        >
          Skip Payment Setup & Continue to Upload
        </Button>

        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 mt-0.5 text-primary" />
            <div className="text-sm text-muted-foreground">
              <strong className="text-foreground">About Synapse SDK Payments:</strong> These transactions use real USDFC tokens on the Filecoin Calibration network. 
              Deposit provides funds for storage, and approval allows WarmStorage to automatically pay for your uploads. 
              All transactions are verified on-chain with PDP proofs.
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

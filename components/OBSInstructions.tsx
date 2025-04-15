"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Copy, ChevronDown, ChevronUp, Info, Eye, EyeOff } from "lucide-react"
import { Toaster, toast } from "sonner"

interface OBSInstructionsProps {
  clientId: string
  roomId: string
  streamUpdate?: string
  roomData?: {
    streamKey: string
  }
}

const OBSInstructions = ({ clientId, roomId, roomData, streamUpdate }: OBSInstructionsProps) => {
  const [visible, setVisible] = useState<boolean>(true)
  const [keyVisible, setKeyVisible] = useState<boolean>(false)
  const [idVisible, setIdVisible] = useState<boolean>(false)

  const toggleVisibility = () => {
    setVisible((prev) => !prev)
  }

  const handleCopyKey = () => {
    const textToCopy = roomData?.streamKey || roomId
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        toast.success("Stream key copied")
      })
      .catch(() => {
        toast.error("Could not copy stream key to clipboard")
      })
  }

  const handleCopyId = () => {
    navigator.clipboard
      .writeText(clientId)
      .then(() => {
        toast.success("ID copied")
      })
      .catch(() => {
        toast.error("Could not copy client ID to clipboard")
      })
  }

  return (
    <Card className="w-full h-[90%] shadow-md mb-auto">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-medium flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          OBS Stream Instructions
        </CardTitle>
      
      </CardHeader>

      {visible && (
        <CardContent className="pt-2">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              OBS stream will appear once the class is live. Please ensure that you are streaming to the correct URL and
              key in OBS.
            </div>

        {streamUpdate === "" && (        
            <>
            <Collapsible open={idVisible} onOpenChange={setIdVisible} className="border rounded-md">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-normal">
                      ID
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {idVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <div className="flex items-center justify-between mt-1 p-2 bg-muted/50 rounded-md">
                  <code className="text-sm font-mono">{clientId}</code>
                  <Button variant="outline" size="sm" onClick={handleCopyId} className="h-8">
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={keyVisible} onOpenChange={setKeyVisible} className="border rounded-md">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-normal">
                      Stream Key
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {keyVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <div className="flex items-center justify-between mt-1 p-2 bg-muted/50 rounded-md">
                  <code className="text-sm font-mono">{roomData?.streamKey || roomId}</code>
                  <Button variant="outline" size="sm" onClick={handleCopyKey} className="h-8">
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
            </>    
            )}

          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default OBSInstructions
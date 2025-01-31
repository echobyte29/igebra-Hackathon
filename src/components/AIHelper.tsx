import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Magnet from "./Magnet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";

interface SentimentResult {
  label: string;
  score: number;
}

const AIHelper = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter your question",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-response', {
        body: { query: userInput.trim() }
      });

      if (error) throw error;

      if (!data?.answer) {
        throw new Error('No response received');
      }

      setResponse(data.answer);
      
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await supabase.from("ai_responses").insert({
          user_id: user.id,
          query: userInput.trim(),
          response: data.answer,
          sentiment: null
        });
      }

      setUserInput("");
    } catch (error: any) {
      console.error("Error getting AI response:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClick = () => {
    setShowPopup(true);
    setResponse(null);
    setSentiment(null);
  };

  return (
    <>
      <div className="fixed bottom-8 left-8 z-50">
        <Magnet
          padding={50}
          magnetStrength={50}
          wrapperClassName="cursor-pointer"
          onClick={handleClick}
        >
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full shadow-lg transform transition-all duration-300 hover:scale-105"
          >
            Need Help?
          </Button>
        </Magnet>
      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl z-50 max-w-sm border border-purple-200 dark:border-purple-800"
          >
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-4 text-purple-700 dark:text-purple-300">
              How can I help you?
            </h3>
            <div className="space-y-4">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <Button
                onClick={handleSubmit}
                disabled={isAnalyzing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isAnalyzing ? "Processing..." : "Ask"}
              </Button>
              {response && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
                >
                  <p className="text-gray-700 dark:text-gray-300">{response}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIHelper;
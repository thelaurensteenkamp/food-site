import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up Gemini API client securely on the server
// Default to empty string if not defined; we handle missing keys gracefully in the endpoint
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Static Menu Data
export interface MenuItem {
  id: string;
  name: string;
  category: "burgers" | "sides" | "beverages" | "desserts";
  price: number;
  description: string;
  calories: number;
  image: string;
  customizationOptions: {
    type: "burgers" | "sides" | "beverages" | "desserts";
    options: string[];
  };
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "classic-burger",
    name: "Sizzle Classic",
    category: "burgers",
    price: 6.99,
    description: "Flame-grilled premium Aberdeen beef patty, signature house sauce, fresh leaf lettuce, heirloom tomato, pickles, and toasted brioche bun.",
    calories: 580,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "burgers",
      options: ["patties", "cheese", "exclude_onions", "exclude_pickles", "extra_sauce"]
    }
  },
  {
    id: "cheese-burger",
    name: "Golden Cheddar Melt",
    category: "burgers",
    price: 8.49,
    description: "Double smash patty, melted aged Wisconsin cheddar cheese, honey-grilled sweet onions, Dijon mustard, and signature house spread.",
    calories: 790,
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "burgers",
      options: ["patties", "cheese", "exclude_onions", "exclude_pickles", "extra_sauce"]
    }
  },
  {
    id: "spicy-burger",
    name: "Volcano Crunch",
    category: "burgers",
    price: 8.99,
    description: "Crispy fried chicken breast dipped in hot Nashville chili oil, melted pepper-jack cheese, custom jalapeno-lime cream slaw, and pickled jalapeno.",
    calories: 720,
    image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "burgers",
      options: ["patties", "cheese", "exclude_onions", "exclude_pickles", "extra_sauce"]
    }
  },
  {
    id: "garden-burger",
    name: "Avocado Smash Veggie",
    category: "burgers",
    price: 7.99,
    description: "Rich house-made fiber-packed grain & plant patty, fresh smashed Haas avocado, field organic baby greens, cucumber, and roasted garlic aioli.",
    calories: 460,
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "burgers",
      options: ["patties", "cheese", "exclude_onions", "exclude_pickles", "extra_sauce"]
    }
  },
  {
    id: "golden-fries",
    name: "Sizzle Salted Fries",
    category: "sides",
    price: 3.49,
    description: "Idaho russet potatoes twice fried to premium crisp perfection, seasoned with harvested sea salt flakes.",
    calories: 320,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "sides",
      options: ["salt_level", "spice_dust"]
    }
  },
  {
    id: "truffle-fries",
    name: "Rosemary Truffle Fries",
    category: "sides",
    price: 4.99,
    description: "House-cut sea salt fries tossed in premium white truffle oil, hand-shaved Parmigiano-Reggiano, and fresh rosemary sprigs.",
    calories: 410,
    image: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "sides",
      options: ["salt_level", "spice_dust"]
    }
  },
  {
    id: "onion-rings",
    name: "Crispy Onion Rings",
    category: "sides",
    price: 3.99,
    description: "Jumbo sweet Texas onions double dipped in golden craft-beer batter, fried to light crunch, served with spicy BBQ brew dip.",
    calories: 380,
    image: "https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "sides",
      options: ["salt_level", "spice_dust"]
    }
  },
  {
    id: "byte-cola",
    name: "Premium Craft Cola",
    category: "beverages",
    price: 2.29,
    description: "Artisanal cola brewed, sweet cane sugar finish, carbonated to absolute crispness.",
    calories: 140,
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "beverages",
      options: ["drink_size", "ice_level"]
    }
  },
  {
    id: "lemonade",
    name: "Mint Infused Lemonade",
    category: "beverages",
    price: 2.79,
    description: "Cold pressed organic lemons, raw simple cane sugar, chilled together with fresh fragrant garden mint leaves.",
    calories: 110,
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "beverages",
      options: ["drink_size", "ice_level"]
    }
  },
  {
    id: "velvet-shake",
    name: "Velvet Milkshake",
    category: "beverages",
    price: 4.49,
    description: "Thick hand-spun double vanilla bean churned milkshake, topped with a cloud of whipped cream and caramelized waffle dust.",
    calories: 520,
    image: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "beverages",
      options: ["drink_size", "shake_flavor"]
    }
  },
  {
    id: "lava-cake",
    name: "Molten Fudge Cocoa Cake",
    category: "desserts",
    price: 5.49,
    description: "Warm single-origin dark chocolate cake structure surrounding an explosive volcano of hot liquid molten fudge.",
    calories: 450,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "desserts",
      options: ["extra_drizzle"]
    }
  },
  {
    id: "cookie-skillet",
    name: "Deep Dish Chocolate Skillet",
    category: "desserts",
    price: 5.99,
    description: "Cast-iron baked premium brown butter brown sugar chocolate chunk cookie, soft and chewy center, topped with rock sea salt caramel drizzle.",
    calories: 540,
    image: "https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&w=600&q=80",
    customizationOptions: {
      type: "desserts",
      options: ["extra_drizzle"]
    }
  }
];

// Provide static menu items
app.get("/api/menu", (req, res) => {
  res.json({ menu: MENU_ITEMS });
});

// Configure the function declarations for Gemini to add/remove/update the cart
const add_item_to_cart_declaration: FunctionDeclaration = {
  name: "add_item_to_cart",
  description: "Adds a menu item to the customer's grocery/shopping cart. Always use the specified item ID from the standard menu.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemId: {
        type: Type.STRING,
        description: "The unique ID of the menu item (e.g. 'classic-burger', 'cheese-burger', 'spicy-burger', 'garden-burger', 'golden-fries', 'truffle-fries', 'onion-rings', 'byte-cola', 'lemonade', 'velvet-shake', 'lava-cake', 'cookie-skillet').",
      },
      quantity: {
        type: Type.INTEGER,
        description: "The quantity to add (e.g., 1, 2, 3). Defaults to 1 if not specified.",
      },
      customizations: {
        type: Type.OBJECT,
        description: "Customization options selected for the item based on customer requests.",
        properties: {
          patties: {
            type: Type.INTEGER,
            description: "Number of beef patties (Only for burgers). Default classic burger is 1, cheese burger is 2.",
          },
          cheese: {
            type: Type.INTEGER,
            description: "Number of cheese slices (Only for burgers).",
          },
          excludeOnions: {
            type: Type.BOOLEAN,
            description: "Whether to exclude onions from the burger.",
          },
          excludePickles: {
            type: Type.BOOLEAN,
            description: "Whether to exclude pickles from the burger.",
          },
          extraSauce: {
            type: Type.BOOLEAN,
            description: "Whether to add extra house signature sauce.",
          },
          saltLevel: {
            type: Type.STRING,
            description: "Fries salt volume: 'regular', 'light', or 'none'.",
          },
          spiceDust: {
            type: Type.BOOLEAN,
            description: "For fries/rings: whether to dust with spicy cajun pepper seasoning.",
          },
          size: {
            type: Type.STRING,
            description: "Size for drinks: 'S', 'M', or 'L'. Defaults to 'M'.",
          },
          iceLevel: {
            type: Type.STRING,
            description: "Ice for drinks: 'regular', 'light', or 'none'.",
          },
          shakeFlavor: {
            type: Type.STRING,
            description: "For velvet milkshake flavor: 'Vanilla', 'Chocolate', or 'Strawberry'.",
          },
          extraDrizzle: {
            type: Type.BOOLEAN,
            description: "For desserts: whether to add extra delicious caramel/fudge drizzle.",
          }
        }
      }
    },
    required: ["itemId"]
  }
};

const remove_item_from_cart_declaration: FunctionDeclaration = {
  name: "remove_item_from_cart",
  description: "Removes an item from the customer's shopping cart.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemId: {
        type: Type.STRING,
        description: "The unique ID of the menu item to remove.",
      }
    },
    required: ["itemId"]
  }
};

const clear_cart_declaration: FunctionDeclaration = {
  name: "clear_cart",
  description: "Clears all items completely from the customer's shopping cart.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

// Handle chat request with Gemini securely
app.post("/api/assistant/chat", async (req: express.Request, res: express.Response) => {
  try {
    const { messages, currentCart } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        reply: "Welcome to our Sizzle & Fry Fast Food restaurant! (Note: The server-side GEMINI_API_KEY environment variable is not configured yet. I can assist you with local menu actions, but to chat with me dynamically, please configure the API key in Settings > Secrets!)",
        cartActions: []
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array." });
    }

    // Format the conversation flow
    const formattedHistory = messages.map(msg => {
      return {
        role: msg.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: msg.text }]
      };
    });

    const activeCartInfo = currentCart && currentCart.length > 0
      ? currentCart.map((c: any) => `- ${c.quantity}x ${c.name} (ID: ${c.id}) with customizations: ${JSON.stringify(c.customizations || {})}`).join("\n")
      : "The customer's cart is currently empty.";

    const systemInstruction = `You are "Sizzly", a highly positive, charming, and efficient AI Drive-Thru companion for "Sizzle & Fry" gourmet fast-food joint.
Your primary role is to guide the user through our premium menu, answer questions about calories, ingredients, or taste, recommend excellent pairings, and help build/modify their shopping cart.

OUR MENU DETAILS:
${MENU_ITEMS.map(item => `- Brand name: "${item.name}" (ID: "${item.id}"), category: ${item.category}, price: $${item.price}, description: "${item.description}", calories: ${item.calories} kcal. Options: ${JSON.stringify(item.customizationOptions.options)}`).join("\n")}

PAIRING RULES:
- If a customer adds or shows interest in a Burger, warmly recommend ordering crispy 'golden-fries' or our artisanal 'truffle-fries', and a cold drink like 'byte-cola'.
- If they order spicy-burger, suggest 'lemonade' to wash down the heat, or a 'velvet-shake'.
- If they order Desserts, they might love pairing with vanilla Velvet Milkshake.

CUSTOMER CART STATE:
${activeCartInfo}

CART TOOLS ACTIONS:
You have access to critical cart tools which let you automatically add or remove items to/from the customer's cart right on the spot!
When a user asks: "Give me a cheese burger", "add fries", "get me light salt", or "remove lava cake", you MUST call the matching function tool.
Do NOT just tell them you added it; invoke the tool so the cart actually updates!
If customizations are requested, pass them into the customizations parameter.
Keep your conversational style extremely friendly, fast-food themed, brief, and absolute peak quality. Let's make this order delicious!`;

    // Perform query with safety and modern guidelines
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedHistory,
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: [{
          functionDeclarations: [
            add_item_to_cart_declaration,
            remove_item_from_cart_declaration,
            clear_cart_declaration
          ]
        }]
      }
    });

    // Check if the model made function calls
    const functionCalls = response.functionCalls;
    const cartActions: any[] = [];
    let replyText = response.text || "";

    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === "add_item_to_cart") {
          const args = call.args as any;
          const matchingItem = MENU_ITEMS.find(m => m.id === args.itemId);
          cartActions.push({
            type: "ADD",
            itemId: args.itemId,
            name: matchingItem ? matchingItem.name : args.itemId,
            quantity: args.quantity || 1,
            customizations: args.customizations || {}
          });
          if (!replyText) {
            replyText = `I've added ${args.quantity || 1}x ${matchingItem ? matchingItem.name : args.itemId} to your cart with your requested customization! Will there be anything else for today?`;
          }
        } else if (call.name === "remove_item_from_cart") {
          const args = call.args as any;
          const matchingItem = MENU_ITEMS.find(m => m.id === args.itemId);
          cartActions.push({
            type: "REMOVE",
            itemId: args.itemId,
            name: matchingItem ? matchingItem.name : args.itemId
          });
          if (!replyText) {
            replyText = `Understood. I have removed ${matchingItem ? matchingItem.name : args.itemId} from your order. Let me know if you would like to add something else!`;
          }
        } else if (call.name === "clear_cart") {
          cartActions.push({
            type: "CLEAR"
          });
          if (!replyText) {
            replyText = `Got it! I've cleared your order list. We can start fresh whenever you are ready!`;
          }
        }
      }
    }

    res.json({
      reply: replyText,
      cartActions
    });
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    res.status(500).json({ error: error.message || "Internal Assistant Error" });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Integrate Vite as a middleware during local development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static asset serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FastFoodServer] Server booted and running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

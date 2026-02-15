import { createContext, useReducer, Dispatch, ReactNode } from "react";

interface StonefruitState {
  linkSuccess: boolean;
  isItemAccess: boolean;
  isPaymentInitiation: boolean;
  isUserTokenFlow: boolean;
  isCraProductsExclusively: boolean;
  linkToken: string | null;
  accessToken: string | null;
  userToken: string | null;
  userId: string | null;
  itemId: string | null;
  isError: boolean;
  backend: boolean;
  products: string[];
  linkTokenError: {
    error_message: string;
    error_code: string;
    error_type: string;
  };
}

const initialState: StonefruitState = {
  linkSuccess: false,
  isItemAccess: true,
  isPaymentInitiation: false,
  isCraProductsExclusively: false,
  isUserTokenFlow: false,
  linkToken: "", // Don't set to null or error message will show up briefly when site loads
  userToken: null,
  userId: null,
  accessToken: null,
  itemId: null,
  isError: false,
  backend: true,
  products: ["transactions"],
  linkTokenError: {
    error_type: "",
    error_code: "",
    error_message: "",
  },
};

type StonefruitAction = {
  type: "SET_STATE";
  state: Partial<StonefruitState>;
};

interface StonefruitContext extends StonefruitState {
  dispatch: Dispatch<StonefruitAction>;
}

const Context = createContext<StonefruitContext>(
  initialState as StonefruitContext
);

const { Provider } = Context;
export const StonefruitProvider: React.FC<{ children: ReactNode }> = (
  props
) => {
  const reducer = (
    state: StonefruitState,
    action: StonefruitAction
  ): StonefruitState => {
    switch (action.type) {
      case "SET_STATE":
        return { ...state, ...action.state };
      default:
        return { ...state };
    }
  };
  const [state, dispatch] = useReducer(reducer, initialState);
  return <Provider value={{ ...state, dispatch }}>{props.children}</Provider>;
};

export default Context;

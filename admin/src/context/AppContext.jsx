import { createContext } from "react";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const currency = "$";

  const calculateAge = (dob) => {
    // Agar dob nahi hai, toh 'N/A' return kar do
    if (!dob) {
      return "N/A";
    }
    const today = new Date();
    const birtDate = new Date(dob);

    // Agar dob galat format mein hai, toh bhi 'N/A' return kar do
    if (isNaN(birtDate)) {
      return "N/A";
    }

    let age = today.getFullYear() - birtDate.getFullYear();
    return age;
  };

  const months = [
    " ",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const slotDateFormat = (slotDate) => {
    const dateArray = slotDate.split("_");
    return (
      dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
    );
  };

  const value = {
    calculateAge,
    slotDateFormat,
    currency,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;

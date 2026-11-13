/** S-21 hope; stored in English because the PDF matches on it. Everyone is Other Sheep unless marked otherwise. */
export const OTHER_SHEEP = "Other Sheep";
export type Person = {
  id: string;
  name: string;
  group: string;
  email: string;
  phone: string;
  address: string;
  gender?: string;
  isElder?: boolean;
  isMS?: boolean;
  expected_login?: string[];
  dob?: string;
  baptized?: string;
  hope?: string;
  familyHeadId?: string;
  emergencyName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;
  spiritualStatus?: string;
  isSFTS?: boolean;
  isRP?: boolean;
  isSP?: boolean;
  isFM?: boolean;
};

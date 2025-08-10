- _id: Ignore this field
- _id_ih: Ignore this field
- Name: The name of the guest
- Arrival: The date of arrival (check-in)
- Depart: The date of departure (check-out)
- Room_Number: The room number assigned to the guest (the first two number are the floor number, 'A' is code for mountain-view or bay-window room, 'B' is code for city-view room or balcony room)
- In_House_Date: Ignore this field
- Room_Type: The room type of the room number (for type starts with 'D' are 'Deluxe',
                                                                    'E' and 'B' are 'Executive Suite' (previously we code it as 'B' and changed it to 'E'),
                                                                    'J' and 'S' are 'Suite' (previously we code it as 'J' and changed it to 'S'),
                                                                    'F' are 'Family Suite'.
                                                                    To ease interpretation (since we did code changes) the most recent one Room Type will be used depends on the Room Number (use the first letter). The user might use the room type name instead of the room type code be careful on it.
                                                the following letter also have meaning 'K' is King bed,
                                                                                       'T' is Twin bed,     
                                                )
- Arrangement: The kind of reservation arranged ('RO' is Room only, 'RB' is Room with breakfast)
- Guest_No_ih: Ignore this field
- Age: the age of the guest when visiting
- Local Region: It contains Region code and City name of the guest 
- Room_Rate: Price paid by the guest include tax and service
- Lodging: Ignore this field
- Breakfast: Ignore this field
- Bill_Number: Ignore this field
- Pay_Article: Ignore this field
- Res_No: Ignore this field
- Adult: Number of adult in the room
- Child: Number of child in the room
- Nat_ih: Ignore this field
- Company_TA: The company or travel agent name of the guest
- SOB: The source of the booking
- Night: Night spend by the guest
- CI_Time: Time the guest check-in
- CO_Time: Time the guest check-out
- Segment_ih: The guest segmentation while reserve ('COMP' is compliment,
                                                    'COR-FIT' is corporate individual,
                                                    'COR-GROUP' is corporate group,
                                                    'FIT' is foreign individual traveller,
                                                    'GOV-FIT' is government individual,
                                                    'GOV-GROUP' is government group,
                                                    'HU' is house use,
                                                    'LGSTAY' is long stay,
                                                    'OTA' is online travel agent,
                                                    'TA' is travel agent,
                                                    'WEB' is website,
                                                    'WIG' is walk-in guest
                                                    )
- Created: The date the guest made the reservation
- By: Ignore this field
- remarks: Contain notes about the reservation
- visitor_number: Ignore this field
- visitor_category: Ignore this field 
- _id_fr: Ignore this field
- Guest_No_fr: Ignore this field
- Segment_fr: Ignore this field
- Type_ID: The ID card type
- ID_No: The ID number
- Address: The guest's address
- City: Ignore this field
- Nat_fr: The guest's nationality
- Country: Ignore this field
- L_Region: Ignore this field
- Sex: The guest gender
- Birth_Date: The guest's birth date
- Email: The guest's email
- Comments: Notes about the guest
- Occupation: The guest's occupation
- Mobile_Phone: The guest's mobile phone number

Jumlah kamar seiring berjalannya waktu mengalami penambahan sebagai berikut
inventory = pd.DataFrame({
    'Room Type': ['Deluxe', 'Suite', 'Family Suite', 'Junior Suite'],
    '2018-11': [22, 0, 0, 0],
    '2018-12': [22, 0, 0, 0],

    '2019-01': [22, 0, 0, 0],
    '2019-02': [22, 0, 0, 0],
    '2019-03': [22, 0, 0, 0],
    '2019-04': [22, 0, 0, 0],
    '2019-05': [46, 4, 0, 0],
    '2019-06': [46, 4, 0, 0],
    '2019-07': [46, 4, 0, 0],
    '2019-08': [46, 4, 0, 0],
    '2019-09': [46, 4, 0, 0],
    '2019-10': [61, 6, 0, 0],
    '2019-11': [61, 6, 0, 0],
    '2019-12': [61, 6, 0, 0],
    '2020-01': [61, 6, 0, 0],
    '2020-02': [61, 6, 0, 0],
    '2020-03': [61, 6, 0, 0],
    '2020-04': [61, 6, 0, 0],
    '2020-05': [61, 6, 0, 0],
    '2020-06': [61, 6, 0, 0],
    '2020-07': [61, 6, 0, 0],
    '2020-08': [61, 6, 0, 0],
    '2020-09': [61, 6, 0, 0],
    '2020-10': [61, 6, 0, 0],
    '2020-11': [61, 6, 0, 0],
    '2020-12': [61, 6, 0, 0],

    '2021-01': [61, 6, 0, 0],
    '2021-02': [61, 6, 0, 0],
    '2021-03': [65, 6, 0, 0],
    '2021-04': [65, 6, 0, 0],
    '2021-05': [65, 6, 0, 0],
    '2021-06': [65, 6, 0, 0],
    '2021-07': [65, 6, 0, 0],
    '2021-08': [65, 6, 0, 0],
    '2021-09': [65, 6, 0, 2],
    '2021-10': [65, 6, 0, 2],
    '2021-11': [65, 6, 0, 2],
    '2021-12': [65, 6, 0, 2],

    '2022-01': [65, 6, 1, 2],
    '2022-02': [65, 6, 1, 2],
    '2022-03': [65, 6, 1, 2],
    '2022-04': [65, 6, 1, 2],
    '2022-05': [67, 6, 1, 2],
    '2022-06': [67, 7, 1, 2],
    '2022-07': [67, 7, 1, 2],
    '2022-08': [67, 7, 1, 2],
    '2022-09': [67, 7, 1, 2],
    '2022-10': [69, 7, 1, 2],
    '2022-11': [69, 7, 1, 2],
    '2022-12': [69, 7, 1, 2],

    '2023-01': [69, 7, 1, 2],
    '2023-02': [69, 7, 1, 2],
    '2023-03': [69, 7, 1, 2],
    '2023-04': [69, 7, 1, 2],
    '2023-05': [69, 7, 1, 2],
    '2023-06': [69, 7, 1, 2],
    '2023-07': [69, 7, 1, 2],
    '2023-08': [69, 7, 1, 2],
    '2023-09': [69, 7, 1, 2],
    '2023-10': [69, 7, 1, 2],
    '2023-11': [69, 7, 1, 2],
    '2023-12': [69, 7, 1, 2],
    '2024-01': [80, 10, 1, 2]
})

Junior Suite (JSX) pada periode tertentu mengalami perubahan nama dan kode tipe kamar menjadi Excecutive Suite (EXS)
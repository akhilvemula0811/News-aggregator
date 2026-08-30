import { GoogleGenerativeAI } from '@google/generative-ai';
import { cache } from './cache';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function hasNonAscii(str: string): boolean {
  return /[^\u0000-\u007F]+/.test(str);
}

const languageNames: Record<string, string> = {
  hi: 'Hindi',
  te: 'Telugu',
  ta: 'Tamil',
  bn: 'Bengali',
  mr: 'Marathi',
  kn: 'Kannada',
  ml: 'Malayalam',
  gu: 'Gujarati',
  pa: 'Punjabi',
  or: 'Odia',
  as: 'Assamese',
  mni: 'Manipuri',
  lus: 'Mizo',
  kha: 'Khasi',
  gom: 'Konkani',
  ne: 'Nepali',
  ur: 'Urdu'
};

// Local dictionary for major Indian language locations to translate mock articles instantly
const LOCATION_TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    'Maharashtra': 'महाराष्ट्र', 'Delhi': 'दिल्ली', 'Karnataka': 'कर्नाटक', 'Tamil Nadu': 'तमिलनाडु',
    'Andhra Pradesh': 'आंध्र प्रदेश', 'Telangana': 'तेलंगाना', 'Uttar Pradesh': 'उत्तर प्रदेश',
    'West Bengal': 'पश्चिम बंगाल', 'Kerala': 'केरल', 'Gujarat': 'गुजरात', 'Rajasthan': 'राजस्थान',
    'Punjab': 'पंजाब', 'Haryana': 'हरियाणा', 'Bihar': 'बिहार', 'Madhya Pradesh': 'मध्य प्रदेश',
    'Arunachal Pradesh': 'अरुणाचल प्रदेश', 'Assam': 'असम', 'Chhattisgarh': 'छत्तीसगढ़', 'Goa': 'गोवा',
    'Himachal Pradesh': 'हिमाचल प्रदेश', 'Jharkhand': 'झारखंड', 'Manipur': 'मणिपुर', 'Meghalaya': 'मेघालय',
    'Mizoram': 'मिजोरम', 'Nagaland': 'नागालैंड', 'Odisha': 'ओडिशा', 'Sikkim': 'सिक्किम', 'Tripura': 'त्रिपुरा',
    'Uttarakhand': 'उत्तराखंड',
    'Mumbai': 'मुंबई', 'Pune': 'पुणे', 'Nagpur': 'नागपुर', 'New Delhi': 'नई दिल्ली', 'Noida': 'नोएडा',
    'Bengaluru': 'बेंगलुरु', 'Mysuru': 'मैसूरु', 'Hubli': 'हुबली', 'Chennai': 'चेन्नई', 'Coimbatore': 'कोयंबटूर',
    'Madurai': 'मदुरै', 'Visakhapatnam': 'विशाखापत्तनम', 'Vijayawada': 'विजयवाड़ा', 'Tirupati': 'तिरुपति',
    'Hyderabad': 'हैदराबाद', 'Warangal': 'वरंगल', 'Nizamabad': 'निजामाबाद', 'Lucknow': 'लखनऊ',
    'Kanpur': 'कानपुर', 'Varanasi': 'वाराणसी', 'Kolkata': 'कोलकाता', 'Howrah': 'हावड़ा', 'Darjeeling': 'दार्जिलिंग',
    'Kochi': 'कोच्चि', 'Thiruvan抗पुरम': 'तिरुवनंतपुरम', 'Kozhikode': 'कोझिकोड', 'Ahmedabad': 'अहमदाबाद',
    'Surat': 'सूरत', 'Vadodara': 'वडोदरा', 'Jaipur': 'जयपुर', 'Jodhpur': 'जोधपुर', 'Udaipur': 'उदयपुर',
    'Ludhiana': 'लुधियाना', 'Amritsar': 'अमृतसर', 'Jalandhar': 'जालंधर', 'Gurugram': 'गुरुग्राम',
    'Faridabad': 'फरीदाबाद', 'Rohtak': 'रोहतक', 'Patna': 'पटना', 'Gaya': 'गया', 'Bhagalpur': 'भागलपुर',
    'Bhopal': 'भोपाल', 'Indore': 'इंदौर', 'Gwalior': 'ग्वालियर', 'Itanagar': 'ईटानगर', 'Tawang': 'तवांग',
    'Guwahati': 'गुवाहाटी', 'Dibrugarh': 'डिब्रूगढ़', 'Raipur': 'रायपुर', 'Bilaspur': 'बिलासपुर',
    'Panaji': 'पणजी', 'Margao': 'मडगांव', 'Shimla': 'शिमला', 'Dharamshala': 'धर्मशाला', 'Ranchi': 'रांची',
    'Jamshedpur': 'जमशेदपुर', 'Imphal': 'इम्फाल', 'Shillong': 'शिलांग', 'Aizawl': 'आइजोल', 'Kohima': 'कोहिमा',
    'Bhubaneswar': 'भुवनेश्वर', 'Cuttack': 'कटक', 'Sambalpur': 'संबलपुर', 'Gangtok': 'गंगटोक',
    'Namchi': 'नामची', 'Agartala': 'अगरतला', 'Dehradun': 'देहरादून', 'Haridwar': 'हरिद्वार'
  },
  te: {
    'Maharashtra': 'మహారాష్ట్ర', 'Delhi': 'ఢిల్లీ', 'Karnataka': 'కర్ణాటక', 'Tamil Nadu': 'తమిళనాడు',
    'Andhra Pradesh': 'ఆంధ్రప్రదేశ్', 'Telangana': 'తెలంగాణ', 'Uttar Pradesh': 'ఉత్తరప్రదేశ్',
    'West Bengal': 'పశ్చిమ బెంగాల్', 'Kerala': 'కేరళ', 'Gujarat': 'గుజరాత్', 'Rajasthan': 'రాజస్థాన్',
    'Punjab': 'పంజాబ్', 'Haryana': 'హర్యానా', 'Bihar': 'బీహార్', 'Madhya Pradesh': 'మధ్యప్రదేశ్',
    'Goa': 'గోవా', 'Uttarakhand': 'ఉత్తరాఖండ్',
    'Mumbai': 'ముం‍బై', 'Pune': 'పూణే', 'Bengaluru': 'బెంగళూరు', 'Chennai': 'చెన్నై',
    'Visakhapatnam': 'విశాఖపట్నం', 'Vijayawada': 'విజయవాడ', 'Tirupati': 'తిరుపతి',
    'Hyderabad': 'హైదరాబాద్', 'Warangal': 'వరంగల్', 'Nizamabad': 'నిజామాబాద్', 'Lucknow': 'లక్నో',
    'Kanpur': 'కాన్పూర్', 'Kolkata': 'కోల్‌కతా', 'Dehradun': 'డెహ్రాడూన్', 'Haridwar': 'హరిద్వార్'
  },
  ta: {
    'Maharashtra': 'மகாராஷ்டிரா', 'Delhi': 'டெல்லி', 'Karnataka': 'கர்நாடகா', 'Tamil Nadu': 'தமிழ்நாடு',
    'Andhra Pradesh': 'ஆந்திரப் பிரதேசம்', 'Telangana': 'தெலுங்கானா', 'Uttar Pradesh': 'உத்தரப் பிரதேசம்',
    'West Bengal': 'மேற்கு வங்கம்', 'Kerala': 'கேரளா', 'Gujarat': 'குஜராத்', 'Rajasthan': 'ராஜஸ்தான்',
    'Punjab': 'பஞ்சாப்', 'Haryana': 'ஹரியானா', 'Bihar': 'பீகார்', 'Madhya Pradesh': 'மத்தியப் பிரதேசம்',
    'Goa': 'கோவா', 'Uttarakhand': 'உத்தரகண்ட்',
    'Mumbai': 'மும்பை', 'Pune': 'புனே', 'Bengaluru': 'பெங்களூரு', 'Chennai': 'சென்னை',
    'Coimbatore': 'கோயம்புத்தூர்', 'Madurai': 'மதுரை', 'Hyderabad': 'ஹைதராபாத்',
    'Visakhapatnam': 'விசாகப்பட்டினம்', 'Vijayawada': 'விஜயவாடா', 'Tirupati': 'திருப்பதி',
    'Lucknow': 'லக்னோ', 'Kanpur': 'கான்பூர்', 'Kolkata': 'கொல்கத்தா', 'Dehradun': 'டேராடூன்', 'Haridwar': 'ஹரித்வார்'
  }
};

// Static description texts in mock db to bypass Gemini API limits
const STATIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    'Winter conditions intensify with a sudden dip in night temperatures in the valleys.': 'घाटियों में रात के तापमान में अचानक गिरावट के साथ सर्दियों की स्थिति तेज हो गई है।',
    'Meteorological department issues weather warning predicting monsoon rain patterns in hilly areas.': 'मौसम विभाग ने पहाड़ी क्षेत्रों में मानसून की बारिश के पैटर्न की भविष्यवाणी करते हुए मौसम की चेतावनी जारी की है।',
    'Financial aid awarded to meritorious students from lower-income backgrounds.': 'कम आय वाले पृष्ठभूमि के मेधावी छात्रों को वित्तीय सहायता प्रदान की गई।',
    'Vocational centers in key districts will offer skill-oriented courses for youth.': 'प्रमुख जिलों में व्यावसायिक केंद्र युवाओं के लिए कौशल-उन्मुख पाठ्यक्रम प्रदान करेंगे।',
    'Railway authorities introduce a daily tourist express linking key cultural landmarks.': 'रेलवे अधिकारियों ने प्रमुख सांस्कृतिक स्थलों को जोड़ने वाली एक दैनिक पर्यटक एक्सप्रेस शुरू की।',
    'The state tourism department inaugurates nature-friendly lodging options for travelers.': 'राज्य पर्यटन विभाग ने यात्रियों के लिए प्रकृति-अनुकूल आवास विकल्पों का उद्घाटन किया।',
    'Craft experts host training sessions on regional silk and cotton weaving styles.': 'शिल्प विशेषज्ञ क्षेत्रीय रेशम और सूती बुनाई शैलियों पर प्रशिक्षण सत्र आयोजित करते हैं।',
    'Designers present modern apparel collections crafted from locally sourced handspun fabrics.': 'डिजाइनर स्थानीय स्तर पर प्राप्त हाथ से काते गए कपड़ों से तैयार किए गए आधुनिक परिधान संग्रह प्रस्तुत करते हैं।',
    'Top gaming teams gather in tech stadiums to compete in the regional tournament finals.': 'शीर्ष गेमिंग टीमें क्षेत्रीय टूर्नामेंट फाइनल में प्रतिस्पर्धा करने के लिए टेक स्टेडियमों में एकत्र होती हैं।',
    'High-scoring student develops creative mobile game during summer vacation.': 'उच्च स्कोरिंग छात्र ने गर्मियों की छुट्टियों के दौरान रचनात्मक मोबाइल गेम विकसित किया।',
    'Health department conducts vaccination drives across municipal sectors.': 'स्वास्थ्य विभाग नगरपालिका क्षेत्रों में टीकाकरण अभियान चलाता है।',
    'Modern intensive care unit inaugurated to provide advanced treatment options.': 'उन्नत उपचार विकल्प प्रदान करने के लिए आधुनिक गहन चिकित्सा इकाई का उद्घाटन किया गया।',
    'Wellness coaches host public sessions explaining exercise and diet guidelines.': 'वेलनेस कोच व्यायाम और आहार दिशानिर्देशों को समझाने के लिए सार्वजनिक सत्रों की मेजबानी करते हैं।',
    'International film directors showcase award-winning projects at the district hall.': 'अंतर्राष्ट्रीय फिल्म निर्देशकों ने जिला हॉल में पुरस्कार विजेता परियोजनाओं का प्रदर्शन किया।',
    'Renovation of regional art center finished, allowing regular stage performances.': 'क्षेत्रीय कला केंद्र का नवीनीकरण कार्य समाप्त हो गया है, जिससे नियमित रूप से मंच प्रदर्शन की अनुमति मिलेगी।',
    'Coordinated police sweeps result in seizure of illegal assets in several locations.': 'समन्वित पुलिस कार्रवाई के परिणामस्वरूप कई स्थानों पर अवैध संपत्ति जब्त की गई।',
    'Traffic police department initiates safety seminars for vehicle drivers.': 'यातायात पुलिस विभाग ने वाहन चालकों के लिए सुरक्षा सेमिनार शुरू किए हैं।',
    'Under the digital education scheme, 50 schools are equipped with smart boards and computer labs.': 'डिजिटल शिक्षा योजना के तहत 50 स्कूलों को स्मार्ट बोर्ड और कंप्यूटर लैब से लैस किया गया है।',
    'Sports department announces state-of-the-art training center for young players.': 'खेल विभाग ने युवा खिलाड़ियों के लिए अत्याधुनिक प्रशिक्षण केंद्र की घोषणा की।',
    'State cricket board organizes regional tournament to spot talented players.': 'राज्य क्रिकेट बोर्ड प्रतिभाशाली खिलाड़ियों की पहचान करने के लिए क्षेत्रीय टूर्नामेंट का आयोजन करता है।',
    'Technical team sets up specialized security operations center for district administration.': 'तकनीकी टीम जिला प्रशासन के लिए विशेष सुरक्षा संचालन केंद्र स्थापित करती है।',
    'High-speed network project successfully links remote villages to municipal digital services.': 'हाई-स्पीड नेटवर्क परियोजना दूरदराज के गांवों को नगरपालिका डिजिटल सेवाओं से सफलतापूर्वक जोड़ती है।',
    'Expansion project expected to improve regional transport and create logistics jobs.': 'विस्तार परियोजना से क्षेत्रीय परिवहन में सुधार और लॉजिस्टिक्स नौकरियों के सृजन की उम्मीद है।',
    'Handloom cooperative societies report increased orders from global fashion houses.': 'हथकरघा सहकारी समितियों ने वैश्विक फैशन घरानों से बढ़े हुए ऑर्डर की रिपोर्ट दी है।',
    'Scientific team establishes weather monitoring sensors at state university campus.': 'वैज्ञानिक टीम ने राज्य विश्वविद्यालय परिसर में मौसम निगरानी सेंसर स्थापित किए।',
    'Environmentalists note presence of rare flora and fauna species in reserve forest zone.': 'पर्यावरणविदों ने आरक्षित वन क्षेत्र में दुर्लभ वनस्पतियों और जीवों की प्रजातियों की उपस्थिति दर्ज की।',
    'Medical officers dispatch mobile vans to provide healthcare services in rural blocks.': 'चिकित्सा अधिकारियों ने ग्रामीण ब्लॉकों में स्वास्थ्य सेवाएं प्रदान करने के लिए मोबाइल वैन भेजीं।',
    'Hospital upgrades pediatric department with advanced neonatal ICU beds and staff.': 'अस्पताल ने बाल चिकित्सा विभाग को उन्नत नवजात आईसीयू बेड और कर्मचारियों के साथ अपग्रेड किया।',
    'Local cultural trust hosts week-long festival featuring folk music and regional food.': 'स्थानीय सांस्कृतिक ट्रस्ट लोक संगीत और क्षेत्रीय भोजन वाले सप्ताह भर चलने वाले उत्सव की मेजबानी करता है।',
    'District safety sweep leads to recovery of stolen assets and arrest of offenders.': 'जिला सुरक्षा अभियान से चोरी की संपत्ति बरामद हुई और अपराधियों की गिरफ्तारी हुई।',
    'Traffic division starts public awareness drive to reduce road accidents in city.': 'यातायात प्रभाग ने शहर में सड़क दुर्घटनाओं को कम करने के लिए सार्वजनिक जागरूकता अभियान शुरू किया।',
    'Regional development fund cleared to upgrade roads, drainage systems, and water supply grids.': 'आने वाले वर्ष में सड़कों, जल निकासी प्रणालियों और जल आपूर्ति ग्रिडों को अपग्रेड करने के लिए क्षेत्रीय विकास कोष को मंजूरी दी गई।',
    'New rural road project connects agricultural zones to local wholesale markets.': 'नई ग्रामीण सड़क परियोजना कृषि क्षेत्रों को स्थानीय थोक बाजारों से जोड़ती है।',
    'Public transit agency adds new bus schedules on busy commuter routes.': 'सार्वजनिक परिवहन एजेंसी व्यस्त यात्री मार्गों पर नई बस समय सारिणी जोड़ती है।',
    'Welfare department initiates pension and cash transfer scheme for eligible households.': 'कल्याण विभाग पात्र परिवारों के लिए पेंशन और नकद हस्तांतरण योजना शुरू करता है।',
    'Municipal workers launch sanitation drive to clean commercial markets and streets.': 'नगरपालिका कर्मचारी वाणिज्यिक बाजारों और सड़कों को साफ करने के लिए स्वच्छता अभियान शुरू करते हैं।',
    'Historic cultural festival starts with street parades and regional music shows.': 'ऐतिहासिक सांस्कृतिक उत्सव सड़क परेड और क्षेत्रीय संगीत शो के साथ शुरू होता है।'
  },
  te: {
    'Winter conditions intensify with a sudden dip in night temperatures in the valleys.': 'లోయలలో రాత్రి ఉష్ణోగ్రతలు ఒక్కసారిగా పడిపోవడంతో చలి తీవ్రత పెరిగింది.',
    'Meteorological department issues weather warning predicting monsoon rain patterns in hilly areas.': 'కొండ ప్రాంతాలలో వర్షాల హెచ్చరికలను వాతావరణ శాఖ జారీ చేసింది.',
    'Financial aid awarded to meritorious students from lower-income backgrounds.': 'పేద కుటుంబాలకు చెందిన ప్రతిభావంతులైన విద్యార్థులకు ఆర్థిక సహాయం అందించబడింది.',
    'Vocational centers in key districts will offer skill-oriented courses for youth.': 'యువత కోసం వృత్తి విద్యా కేంద్రాలలో శిక్షణా కోర్సులు ప్రారంభించబడ్డాయి.',
    'Railway authorities introduce a daily tourist express linking key cultural landmarks.': 'పర్యాటక ప్రాంతాలను అనుసంధానిస్తూ రైల్వే శాఖ రోజువారీ ఎక్స్‌ప్రెస్‌ను ప్రారంభించింది.',
    'The state tourism department inaugurates nature-friendly lodging options for travelers.': 'పర్యాటకుల కోసం ప్రకృతి అనుకూల వసతి గృహాలను పర్యాటక శాఖ ప్రారంభించింది.'
  },
  ta: {
    'Winter conditions intensify with a sudden dip in night temperatures in the valleys.': 'பள்ளத்தாக்குகளில் இரவு வெப்பநிலை திடீரென குறைந்ததால் குளிரின் தீவிரம் அதிகரித்துள்ளது.',
    'Meteorological department issues weather warning predicting monsoon rain patterns in hilly areas.': 'மலைப் பகுதிகளில் மழை எச்சரிக்கையை வானிலை ஆய்வு மையம் வெளியிட்டுள்ளது.',
    'Financial aid awarded to meritorious students from lower-income backgrounds.': 'ஏழை எளிய குடும்பங்களைச் சேர்ந்த மாணவ மாணவியருக்கு நிதியுதவி வழங்கப்பட்டது.',
    'Vocational centers in key districts will offer skill-oriented courses for youth.': 'இளைஞர்களுக்காக முக்கிய மாவட்டங்களில் தொழிற்பயிற்சி நிலையங்கள் தொடங்கப்பட்டுள்ளன.',
    'Railway authorities introduce a daily tourist express linking key cultural landmarks.': 'சுற்றுலாத் தலங்களை இணைக்கும் வகையில் தினசரி சிறப்பு ரயில் இயக்கப்பட்டது.',
    'The state tourism department inaugurates nature-friendly lodging options for travelers.': 'சுற்றுலாப் பயணிகளுக்காக இயற்கை எழில் கொஞ்சும் தங்கும் விடுதியை சுற்றுலாத் துறை திறந்து வைத்துள்ளது.'
  }
};

// Text translation template rules to instantly translate generated mock news patterns
interface TransRule {
  pattern: RegExp;
  hi: string;
  te: string;
  ta: string;
}

const TEMPLATE_RULES: TransRule[] = [
  {
    pattern: /Job fair in ([\w\s]+) sees participation from forty corporates for graduates/i,
    hi: '$1 में जॉब फेयर में स्नातकों के लिए चालीस कॉर्पोरेट्स की भागीदारी देखी गई',
    te: '$1లో జరిగిన జాబ్ ఫెయిర్‌లో గ్రాడ్యుయేట్ల కోసం నలభై కంపెనీలు పాల్గొన్నాయి',
    ta: '$1 இல் வேலைவாய்ப்பு முகாமில் பட்டதாரிகளுக்காக நாற்பது நிறுவனங்கள் பங்கேற்றன'
  },
  {
    pattern: /Vocational training program launched for youth in ([\w\s]+) districts/i,
    hi: '$1 जिलों में युवाओं के लिए व्यावसायिक प्रशिक्षण कार्यक्रम शुरू किया गया',
    te: '$1 జిల్లాల్లో యువత కోసం వృత్తి విద్యా శిక్షణా కార్యక్రమం ప్రారంభించబడింది',
    ta: '$1 மாவட்டங்களில் இளைஞர்களுக்கான தொழிற்பயிற்சி திட்டம் தொடங்கப்பட்டது'
  },
  {
    pattern: /Moderate rains forecast for coastal and hilly regions of ([\w\s]+) next week/i,
    hi: 'अगले सप्ताह $1 के तटीय और पहाड़ी क्षेत्रों में मध्यम बारिश का अनुमान',
    te: 'వచ్చే వారం $1 తీర మరియు కొండ ప్రాంతాలలో సాధారణ వర్షాలు కురిసే అవకాశం ఉంది',
    ta: 'அடுத்த வாரம் $1 இன் கடலோர மற்றும் மலைப் பகுதிகளில் மிதமான மழை பெய்யக்கூடும்'
  },
  {
    pattern: /Temperatures drop as cold wave touches northern belt of ([\w\s]+) plains/i,
    hi: 'शीत लहर के कारण $1 के उत्तरी मैदानी इलाकों में तापमान में गिरावट दर्ज की गई',
    te: 'శీతల గాలులు వీయడంతో $1 మైదాన ప్రాంతాల్లో ఉష్ణోగ్రతలు పడిపోయాయి',
    ta: '$1 சமவெளிப் பகுதிகளில் குளிர்காற்று வீசுவதால் வெப்பநிலை குறைந்தது'
  },
  {
    pattern: /Eco-tourism resort opened at scenic lake near ([\w\s]+) for nature lovers/i,
    hi: 'प्रकृति प्रेमियों के लिए $1 के पास सुंदर झील पर इको-टूरिज्म रिसॉर्ट खोला गया',
    te: 'ప్రకృతి ప్రేమికుల కోసం $1 సమీపంలో అందమైన సరస్సు వద్ద పర్యాటక రిసార్ట్ ప్రారంభించబడింది',
    ta: 'இயற்கை ஆர்வலர்களுக்காக $1 அருகே அழகான ஏரியில் சூழல் சுற்றுலா விடுதி திறக்கப்பட்டது'
  },
  {
    pattern: /New train route connects major historical sites in ([\w\s]+) for tourists/i,
    hi: 'पर्यटकों के लिए $1 के प्रमुख ऐतिहासिक स्थलों को जोड़ने वाला नया ट्रेन मार्ग शुरू',
    te: 'పర్యాటకుల కోసం $1 లోని ప్రధాన చారిత్రక ప్రదేశాలను కలుపుతూ కొత్త రైలు మార్గం',
    ta: 'சுற்றுலாப் பயணிகளுக்காக $1 இன் முக்கிய வரலாற்று இடங்களை இணைக்கும் புதிய ரயில் பாதை'
  },
  {
    pattern: /Traditional street food festival attracts thousands in ([\w\s]+) bazaar/i,
    hi: 'पारंपरिक स्ट्रीट फूड फेस्टिवल ने $1 बाजार में हजारों लोगों को आकर्षित किया',
    te: '$1 బజార్‌లో సాంప్రదాయ వీధి ఆహార పండుగ వేలాది మందిని ఆకర్షించింది',
    ta: '$1 பஜாரில் பாரம்பரிய தெரு உணவு விழா ஆயிரக்கணக்கானோரை ஈர்த்தது'
  },
  {
    pattern: /Organic farming bazaar launched in central market of ([\w\s]+) city/i,
    hi: '$1 शहर के केंद्रीय बाजार में जैविक खेती बाजार शुरू किया गया',
    te: '$1 నగర కేంద్ర మార్కెట్లో సేంద్రీయ వ్యవసాయ బజార్ ప్రారంభించబడింది',
    ta: '$1 நகரத்தின் மத்திய சந்தையில் இயற்கை விவசாய சந்தை தொடங்கப்பட்டது'
  },
  {
    pattern: /Traditional weaving workshop organized to train youth in ([\w\s]+) city limits/i,
    hi: '$1 शहर की सीमाओं में युवाओं को प्रशिक्षित करने के लिए पारंपरिक बुनाई कार्यशाला आयोजित',
    te: '$1 నగర పరిధిలో యువతకు శిక్షణ ఇవ్వడానికి సాంప్రదాయ చేనేత వర్క్‌షాప్',
    ta: '$1 எல்லைக்குள் இளைஞர்களுக்கு பயிற்சி அளிக்க பாரம்பரிய நெசவு பட்டறை ஏற்பாடு'
  },
  {
    pattern: /Regional khadi fashion show organized in ([\w\s]+) city hall/i,
    hi: '$1 सिटी हॉल में क्षेत्रीय खादी फैशन शो का आयोजन किया गया',
    te: '$1 సిటీ హాల్‌లో ప్రాంతీయ ఖాదీ ఫ్యాషన్ షో నిర్వహించబడింది',
    ta: '$1 நகர மண்டபத்தில் பிராந்திய காதி ஆடை வடிவமைப்பு நிகழ்ச்சி நடைபெற்றது'
  },
  {
    pattern: /Regional esports championship matches scheduled in ([\w\s]+) tech stadium/i,
    hi: '$1 टेक स्टेडियम में क्षेत्रीय एस्पोर्ट्स चैंपियनशिप मैच निर्धारित हैं',
    te: '$1 టెక్ స్టేడియంలో ప్రాంతీయ ఇ-స్పోర్ట్స్ ఛాంపియన్‌షిప్ పోటీలు',
    ta: '$1 தொழில்நுட்ப மைதானத்தில் பிராந்திய இ-ஸ்போர்ட்ஸ் சாம்பியன்ஷிப் போட்டிகள் திட்டமிடப்பட்டுள்ளன'
  },
  {
    pattern: /Student-developed puzzle game gains popularity in ([\w\s]+) colleges/i,
    hi: 'छात्रों द्वारा विकसित पहेली गेम ने $1 के कॉलेजों में लोकप्रियता हासिल की',
    te: 'విద్యార్థులు రూపొందించిన పజిల్ గేమ్ $1 కాలేజీలలో ప్రాచుర్యం పొందింది',
    ta: 'மாணவர்கள் தயாரித்த புதிர் விளையாட்டு $1 கல்லூரிகளில் பிரபலமடைந்தது'
  },
  {
    pattern: /assembly speaker in ([\w\s]+) schedules legislative session next week/i,
    hi: '$1 विधानसभा अध्यक्ष ने अगले सप्ताह विधायी सत्र निर्धारित किया',
    te: '$1 శాసనసభ స్పీకర్ వచ్చే వారం శాసనసభ సమావేశాలను ఏర్పాటు చేశారు',
    ta: '$1 சட்டமன்ற சபாநாயகர் அடுத்த वாரம் கூட்டத்தொடரை கூட்டியுள்ளார்'
  },
  {
    pattern: /municipal elections in ([\w\s]+) draw high voter turnout across wards/i,
    hi: '$1 में नगर निगम चुनावों में सभी वार्डों में भारी मतदान हुआ',
    te: '$1 మున్సిపల్ ఎన్నికలలో భారీగా ఓటింగ్ నమోదైంది',
    ta: '$1 நகராட்சி தேர்தலில் வார்டுகள் முழுவதும் அதிக வாக்குகள் பதிவாகின'
  },
  {
    pattern: /sports academy inaugurated in ([\w\s]+) to train young local athletes/i,
    hi: 'युवा स्थानीय एथलीटों को प्रशिक्षित करने के लिए $1 में खेल अकादमी का उद्घाटन',
    te: 'స్థానిక యువ క్రీడాకారులకు శిక్షణ ఇవ్వడానికి $1 లో క్రీడా అకాడమీ ప్రారంభించబడింది',
    ta: 'உள்ளூர் இளம் வீரர்களுக்கு பயிற்சி அளிக்க $1 இல் விளையாட்டு அகாடமி திறக்கப்பட்டது'
  },
  {
    pattern: /school cricket tournament starts in ([\w\s]+) to promote local youth players/i,
    hi: 'स्थानीय युवा खिलाड़ियों को बढ़ावा देने के लिए $1 में स्कूली क्रिकेट टूर्नामेंट शुरू',
    te: 'స్థానిక క్రీడాకారులను ప్రోత్సహించడానికి $1 లో పాఠశాలల క్రికెట్ టోర్నమెంట్ ప్రారంభం',
    ta: 'உள்ளூர் இளம் வீரர்களை ஊக்குவிக்க $1 இல் பள்ளி கிரிக்கெட் போட்டி தொடங்கியது'
  },
  {
    pattern: /new cybersecurity center inaugurated in ([\w\s]+) to protect digital space/i,
    hi: 'डिजिटल स्पेस की सुरक्षा के लिए $1 में नए साइबर सुरक्षा केंद्र का उद्घाटन',
    te: 'డిజిటల్ రక్షణ కోసం $1 లో కొత్త సైబర్ భద్రతా కేంద్రం ప్రారంభించబడింది',
    ta: 'டிஜிட்டல் தளத்தை பாதுகாக்க $1 இல் புதிய சைபர் பாதுகாப்பு மையம் திறக்கப்பட்டது'
  },
  {
    pattern: /rural digital connectivity scheme reaches 100 villages in ([\w\s]+) hinterlands/i,
    hi: 'ग्रामीण डिजिटल कनेक्टिविटी योजना $1 के पिछड़े इलाकों के 100 गांवों तक पहुंची',
    te: 'గ్రామీణ డిజిటల్ కనెక్టివిటీ పథకం $1 లోని 100 గ్రామాలకు చేరుకుంది',
    ta: 'கிராமப்புற டிஜிட்டல் இணைப்பு திட்டம் $1 இன் 100 கிராமங்களை சென்றடைந்தது'
  },
  {
    pattern: /industrial corridor expansion approved for ([\w\s]+) region to boost trade/i,
    hi: 'व्यापार को बढ़ावा देने के लिए $1 क्षेत्र के लिए औद्योगिक गलियारे के विस्तार को मंजूरी',
    te: 'వ్యాపారాన్ని పెంపొందించడానికి $1 ప్రాంతంలో పారిశ్రామిక కారిడార్ విస్తరణకు ఆమోదం',
    ta: 'வர்த்தகத்தை பெருக்க $1 பகுதியில் தொழிற்பேட்டை விரிவாக்கத்திற்கு ஒப்புதல்'
  },
  {
    pattern: /local textile cooperatives note surge in export demand for handloom crafts/i,
    hi: 'स्थानीय कपड़ा सहकारी समितियों ने हथकरघा शिल्प की निर्यात मांग में वृद्धि दर्ज की',
    te: 'చేనేత వస్తువుల ఎగుమతి డిమాండ్‌లో స్థానిక చేనేత సంఘాలు భారీ వృద్ధిని నమోదు చేశాయి',
    ta: 'கைத்தறி கைவினைப் பொருட்களின் ஏற்றுமதி தேவையில் உள்ளூர் நெசவு சங்கங்கள் வளர்ச்சி கண்டுள்ளன'
  },
  {
    pattern: /regional climate research institute set up at university in ([\w\s]+) to study weather/i,
    hi: 'मौसम के अध्ययन के लिए $1 के विश्वविद्यालय में क्षेत्रीय जलवायु अनुसंधान संस्थान की स्थापना',
    te: 'వాతావరణంపై అధ్యయనం కోసం $1 లోని విశ్వవిద్యాలయంలో ప్రాంతీయ వాతావరణ పరిశోధనా సంస్థ ఏర్పాటు',
    ta: 'வானிலை குறித்து ஆராய $1 பல்கலைக்கழகத்தில் பிராந்திய காலநிலை ஆராய்ச்சி மையம் அமைக்கப்பட்டது'
  },
  {
    pattern: /botanists discover rare plant species in ([\w\s]+) forest reserve sanctuary/i,
    hi: 'वनस्पतिशास्त्रियों ने $1 वन आरक्षित अभयारण्य में दुर्लभ पौधे की प्रजाति की खोज की',
    te: 'వృక్షశాస్త్రజ్ఞులు $1 అటవీ రిజర్వ్ ప్రాంతంలో అరుదైన మొక్కను కనుగొన్నారు',
    ta: 'தாவரவியலாளர்கள் $1 வன காப்பகத்தில் அரிய வகை தாவரத்தைக் கண்டறிந்தனர்'
  },
  {
    pattern: /mobile health clinics dispatched to rural blocks of ([\w\s]+) to support villages/i,
    hi: 'ग्रामीणों की सहायता के लिए $1 के ग्रामीण ब्लॉकों में मोबाइल स्वास्थ्य क्लीनिक भेजे गए',
    te: 'గ్రామీణ ప్రజల సహాయం కోసం $1 గ్రామీణ ప్రాంతాలకు మొబైల్ ఆరోగ్య క్లినిక్‌ల తరలింపు',
    ta: 'கிராமப்புற மக்களின் நலனுக்காக $1 கிராமப்புற பகுதிகளுக்கு நடமாடும் மருத்துவமனைகள் அனுப்பப்பட்டன'
  },
  {
    pattern: /pediatric wing expanded at general hospital in ([\w\s]+) to help kids/i,
    hi: 'बच्चों की मदद के लिए $1 के सामान्य अस्पताल में बाल चिकित्सा विंग का विस्तार किया गया',
    te: 'పిల్లల చికిత్స కోసం $1 జనరల్ ఆసుపత్రిలో పీడియాట్రిక్ వింగ్ విస్తరించబడింది',
    ta: 'குழந்தைகளின் சிகிச்சைக்காக $1 பொது மருத்துவமனையில் குழந்தைகள் பிரிவு விரிவாக்கம் செய்யப்பட்டது'
  },
  {
    pattern: /film festival celebrates regional cinema in ([\w\s]+) with international entries/i,
    hi: '$1 में फिल्म महोत्सव ने अंतर्राष्ट्रीय प्रविष्टियों के साथ क्षेत्रीय सिनेमा का जश्न मनाया',
    te: '$1 లో అంతర్జాతీయ చిత్రాల ప్రదర్శనతో ప్రాంతీయ చలనచిత్రోత్సవం',
    ta: '$1 இல் சர்வதேச திரைப்படங்களின் பங்கேற்புடன் பிராந்திய திரைப்பட விழா நடைபெற்றது'
  },
  {
    pattern: /historic theater renovated and reopened to the public in ([\w\s]+) after decade/i,
    hi: '$1 में ऐतिहासिक थिएटर का नवीनीकरण कर एक दशक बाद जनता के लिए फिर से खोला गया',
    te: '$1 లో ఒక దశాబ్దం తర్వాత పునర్నిర్మించిన చారిత్రక థియేటర్ ప్రజల కోసం పునఃప్రారంభం',
    ta: '$1 இல் ஒரு தசாப்தத்திற்குப் பிறகு புதுப்பிக்கப்பட்ட வரலாற்று திரையரங்கம் மக்கள் பயன்பாட்டிற்கு திறக்கப்பட்டது'
  },
  {
    pattern: /cybercrime syndicate busted by regional police in ([\w\s]+) after raid/i,
    hi: 'छापेमारी के बाद $1 में क्षेत्रीय पुलिस ने साइबर अपराध सिंडिकेट का भंडाफोड़ किया',
    te: '$1 లో ప్రాంతీయ పోలీసులు జరిపిన దాడిలో సైబర్ నేరాల ముఠా పట్టుబడింది',
    ta: '$1 இல் பிராந்திய போலீசார் நடத்திய சோதனையில் சைபர் குற்ற கும்பல் பிடிபட்டது'
  },
  {
    pattern: /statewide safety campaign launched by traffic police division in ([\w\s]+)/i,
    hi: '$1 में ट्रैफिक पुलिस डिवीजन द्वारा राज्यव्यापी सुरक्षा अभियान शुरू किया गया',
    te: '$1 లో ట్రాఫిక్ పోలీసుల ఆధ్వర్యంలో రాష్ట్రవ్యాప్త భద్రతా ప్రచారం ప్రారంభం',
    ta: '$1 இல் போக்குவரத்து காவல்துறை சார்பில் மாநில அளவிலான பாதுகாப்பு பிரச்சாரம் தொடங்கப்பட்டது'
  },
  {
    pattern: /smart classrooms launched in government schools in ([\w\s]+) to help students/i,
    hi: 'छात्रों की मदद के लिए $1 के सरकारी स्कूलों में स्मार्ट क्लासरूम शुरू किए गए',
    te: 'విద్యార్థుల కోసం $1 లోని ప్రభుత్వ పాఠశాలల్లో స్మార్ట్ తరగతులు ప్రారంభం',
    ta: 'மாணவர்களின் கல்விக்காக $1 அரசுப் பள்ளிகளில் நவீன வகுப்பறைகள் தொடங்கப்பட்டன'
  },
  {
    pattern: /state scholarship drive benefits over ten thousand students in need/i,
    hi: 'राज्य छात्रवृत्ति अभियान से दस हजार से अधिक जरूरतमंद छात्रों को लाभ मिला',
    te: 'రాష్ట్ర విద్యార్థి వేతనాల పథకం ద్వారా పది వేల మందికి పైగా విద్యార్థులకు ప్రయోజనం',
    ta: 'மாநில கல்வி உதவித்தொகை திட்டம் மூலம் பத்தாயிரத்திற்கும் மேற்பட்ட மாணவர்கள் பயனடைந்தனர்'
  },
  // Summary structures translations
  {
    pattern: /Under the skill development mission, centers in ([\w\s]+) and ([\w\s]+) will train thousands of school dropouts, helping them secure technical jobs in the growing clean energy sector, supporting ([\s\S]+)/i,
    hi: 'कौशल विकास मिशन के तहत, $1 और $2 के केंद्र हजारों स्कूल छोड़ने वाले बच्चों को प्रशिक्षित करेंगे, जिससे उन्हें बढ़ते स्वच्छ ऊर्जा क्षेत्र में तकनीकी नौकरियां हासिल करने में मदद मिलेगी, और $3 को सहायता मिलेगी।',
    te: 'నైపుణ్యాభివృద్ధి మిషన్‌లో భాగంగా, $1 మరియు $2 లలోని కేంద్రాలు పాఠశాల మానివేసిన వారికి శిక్షణ ఇచ్చి, స్వచ్ఛ ఇంధన రంగంలో ఉద్యోగాలు పొందేలా చేస్తాయి, $3 కు మద్దతు ఇస్తాయి.',
    ta: 'திறன் மேம்பாட்டு திட்டத்தின் கீழ், $1 மற்றும் $2 நிலையங்கள் பள்ளி படிப்பை நிறுத்தியவர்களுக்கு பயிற்சி அளித்து, வளர்ந்து வரும் தூய எரிசக்தி துறையில் வேலை பெற உதவும், $3 ஐ ஆதரிக்கும்.'
  },
  {
    pattern: /The employment department organized the hiring drive in ([\w\s]+)\. Recruiting managers from major companies offered immediate placement letters to qualified students in ([\w\s]+), promoting ([\s\S]+)/i,
    hi: 'रोजगार विभाग ने $1 में भर्ती अभियान का आयोजन किया। प्रमुख कंपनियों के भर्ती प्रबंधकों ने $2 में योग्य छात्रों को तत्काल नियुक्ति पत्र प्रदान किए, जिससे $3 को बढ़ावा मिला।',
    te: 'ఉద్యోగ శాఖ $1 లో నియామక డ్రైవ్‌ను నిర్వహించింది. ప్రముఖ కంపెనీల అధికారులు $2 లోని విద్యార్థులకు వెంటనే నియామక పత్రాలు అందజేశారు, $3 ను ప్రోత్సహిస్తూ.',
    ta: 'வேலைவாய்ப்பு துறை $1 இல் வேலைவாய்ப்பு முகாம் நடத்தியது. முக்கிய நிறுவனங்கள் $2 இல் உள்ள தகுதியான மாணவர்களுக்கு உடனடியாக பணி நியமன கடிதங்களை வழங்கின, $3 ஐ மேம்படுத்துகிறது.'
  },
  {
    pattern: /Meteorological specialists forecasted moderate to heavy rainfall in the hilly blocks surrounding ([\w\s]+)\. Local emergency service units are monitoring drainage channels to prevent waterlogging\./i,
    hi: 'मौसम वैज्ञानिकों ने $1 के आसपास के पहाड़ी ब्लॉकों में मध्यम से भारी बारिश का अनुमान लगाया है। जलभराव को रोकने के लिए स्थानीय आपातकालीन सेवाएं जल निकासी चैनलों की निगरानी कर रही हैं।',
    te: 'వాతావరణ నిపుణులు $1 చుట్టుపక్కల కొండ ప్రాంతాలలో మోస్తరు నుండి భారీ వర్షాలు కురిసే అవకాశం ఉందని అంచనా వేశారు. వరద నివారణకు అధికారులు కాలువలను పర్యవేక్షిస్తున్నారు.',
    ta: 'வானிலை నిபுணர்கள் $1 சுற்றியுள்ள மலைப் பகுதிகளில் மிதமான முதல் கனமழை பெய்யக்கூடும் என கணித்துள்ளனர். வெள்ள நீர் தேங்குவதை தடுக்க அதிகாரிகள் வடிகால்களை கண்காணித்து வருகின்றனர்.'
  },
  {
    pattern: /Administration officers in ([\w\s]+) issued cold weather safety guidelines for residents\. Relief teams are coordinating warm clothing distribution campaigns in key areas\./i,
    hi: 'प्रशासनिक अधिकारियों ने $1 में निवासियों के लिए शीतकालीन सुरक्षा दिशानिर्देश जारी किए। राहत टीमें प्रमुख क्षेत्रों में गर्म कपड़े वितरण अभियान का समन्वय कर रही हैं।',
    te: '$1 లో అధికారులు శీతాకాల భద్రతా మార్గదర్శకాలను జారీ చేశారు. స్వచ్ఛంద సంస్థలు దుప్పట్ల పంపిణీని సమన్వయం చేస్తున్నాయి.',
    ta: '$1 இல் அதிகாரிகள் குளிர்கால பாதுகாப்பு வழிகாட்டுதல்களை வெளியிட்டுள்ளனர். முக்கிய பகுதிகளில் கம்பளி ஆடைகள் வழங்கும் பணி நடைபெற்று வருகிறது.'
  },
  {
    pattern: /Water levels in municipal reservoirs near ([\w\s]+) returned to stable levels following recent rainfall\. Irrigation committees confirmed that regional farming needs are fully covered\./i,
    hi: 'हाल ही में हुई बारिश के बाद $1 के पास नगर निगम के जलाशयों में पानी का स्तर सामान्य हो गया है। सिंचाई समितियों ने पुष्टि की है कि क्षेत्रीय खेती की जरूरतें पूरी तरह से सुरक्षित हैं।',
    te: 'ఇటీవలి వర్షాల తర్వాత $1 సమీపంలో జలాశయాలలో నీటి మట్టాలు సాధారణ స్థితి体 చేరాయి. వ్యవసాయ అవసరాలు తీరతాయని అధికారులు ధృవీకరించారు.',
    ta: 'சமீபத்திய மழையால் $1 அருகே உள்ள நீர்நிலைகளில் நீர்மட்டம் உயர்ந்துள்ளது. பாசனத் தேவைகள் முழுமையாக பூர்த்தி செய்யப்படும் என குழுக்கள் தெரிவித்துள்ளன.'
  },
  {
    pattern: /Officials in ([\w\s]+) launched a digital hub to provide high-speed internet and online training to local residents\. The government-backed program aims to connect remote blocks of ([\w\s]+) with the growing tech economy\./i,
    hi: 'अधिकारियों ने $1 में स्थानीय निवासियों को हाई-स्पीड इंटरनेट और ऑनलाइन प्रशिक्षण प्रदान करने के लिए एक डिजिटल हब शुरू किया। इस सरकारी कार्यक्रम का उद्देश्य $2 के दूरदराज के ब्लॉकों को तकनीकी अर्थव्यवस्था से जोड़ना है।',
    te: 'స్థానిక ప్రజలకు ఇంటర్నెట్ మరియు ఆన్‌లైన్ శిక్షణ అందించడానికి $1 లో డిజిటల్ కేంద్రాన్ని అధికారులు ప్రారంభించారు. ఈ పథకం ద్వారా $2 గ్రామీణ ప్రాంతాలను అనుసంధానించనున్నారు.',
    ta: 'மக்களுக்கு அதிவேக இணையம் மற்றும் இணைய வழி பயிற்சி வழங்க $1 இல் டிஜிட்டல் மையம் தொடங்கப்பட்டுள்ளது. இத்திட்டம் $2 கிராமப்புற பகுதிகளை இணைக்க உதவும்.'
  },
  {
    pattern: /The cybersecurity cell in ([\w\s]+) has upgraded its network infrastructure to protect citizen data and prevent digital fraud\. Officers are conducting workshops on online safety and digital transactions\./i,
    hi: '$1 में साइबर सुरक्षा सेल ने नागरिक डेटा की सुरक्षा और डिजिटल धोखाधड़ी को रोकने के लिए अपने नेटवर्क बुनियादी ढांचे को अपग्रेड किया है। अधिकारी ऑनलाइन सुरक्षा पर कार्यशालाएं आयोजित कर रहे हैं।',
    te: '$1 లో సైబర్ సెల్ అధికారులు సైబర్ భద్రతను మెరుగుపరిచారు. ఆన్‌లైన్ మోసాల నివారణపై అవగాహన సదస్సులు నిర్వహిస్తున్నారు.',
    ta: '$1 இல் சைபர் குற்றப் பிரிவு இணையப் பாதுகாப்பை மேம்படுத்தியுள்ளது. இணைய மோசடி தடுப்பு குறித்து விழிப்புணர்வு முகாம்கள் நடத்தப்பட்டு வருகின்றன.'
  },
  {
    pattern: /A new mobile app was introduced by ([\w\s]+)'s public transport department to help commuters track schedules and purchase tickets\. The system is expected to reduce wait times at major hubs\./i,
    hi: 'यात्रियो को समय सारणी ट्रैक करने और टिकट खरीदने में मदद करने के लिए $1 के सार्वजनिक परिवहन विभाग द्वारा एक नया मोबाइल ऐप पेश किया गया। इससे प्रमुख बस स्टैंडों पर प्रतीक्षा समय कम होने की उम्मीद है।',
    te: 'ప్రయాణికులకు సమయ వేళలు మరియు టికెట్ల బుకింగ్ కోసం $1 రవాణా శాఖ కొత్త మొబైల్ యాప్‌ను విడుదల చేసింది. దీనివల్ల ప్రయాణ సమయం ఆదా కానుంది.',
    ta: 'பயணிகள் நேரத்தை அறியவும் டிக்கெட் முன்பதிவு செய்யவும் $1 போக்குவரத்து துறை புதிய செயலியை அறிமுகப்படுத்தியுள்ளது. இதன் மூலம் காத்திருப்பு நேரம் குறையும் என எதிர்பார்க்கப்படுகிறது.'
  },
  {
    pattern: /An industrial development council in ([\w\s]+) approved plans for a new manufacturing corridor\. The project is expected to create several thousand employment opportunities and boost trade across ([\w\s]+)\./i,
    hi: '$1 में एक औद्योगिक विकास परिषद ने एक नए विनिर्माण गलियारे की योजनाओं को मंजूरी दी। इस परियोजना से कई हजार रोजगार के अवसर पैदा होने और $2 में व्यापार को बढ़ावा मिलने की उम्मीद है।',
    te: '$1 లో కొత్త తయారీ కారిడార్ నిర్మాణానికి ఆమోదం లభించింది. ఈ ప్రాజెక్ట్ ద్వారా వేలాది ఉద్యోగ అవకాశాలు లభిస్తాయి మరియు $2 లో వ్యాపారం అభివృద్ధి చెందుతుంది.',
    ta: '$1 இல் புதிய தொழிற்பேட்டை அமைக்க ஒப்புதல் வழங்கப்பட்டுள்ளது. இத்திட்டம் மூலம் ஆயிரக்கணக்கானோருக்கு வேலைவாய்ப்பு கிடைக்கும் மற்றும் $2 இல் வர்த்தகம் பெருகும்.'
  },
  {
    pattern: /Handloom weavers and local artisans near ([\w\s]+) noted a strong increase in demand for traditional crafts\. Cooperative societies are preparing to expand production to fulfill new supply contracts\./i,
    hi: '$1 के पास हथकरघा बुनकरों और स्थानीय कारीगरों ने पारंपरिक शिल्पों की मांग में भारी वृद्धि दर्ज की। सहकारी समितियां नए आपूर्ति समझौतों को पूरा करने के लिए उत्पादन बढ़ाने की तैयारी कर रही हैं।',
    te: '$1 సమీపంలో చేనేत కార్మికులు మరియు కళాకారుల ఉత్పత్తులకు డిమాండ్ పెరిగింది. సహకార సంఘాలు ఉత్పత్తిని పెంచడానికి సిద్ధమవుతున్నాయి.',
    ta: '$1 அருகே உள்ள கைத்தறி நெசவாளர்கள் மற்றும் கைவினைஞர்களின் பொருட்களுக்கு தேவை அதிகரித்துள்ளது. புதிய ஒப்பந்தங்களை பூர்த்தி செய்ய உற்பத்தி அதிகரிக்கப்பட உள்ளது.'
  },
  {
    pattern: /Retailers in ([\w\s]+)'s commercial center reported stable sales growth during the recent festive week\. Business associations highlighted consumer confidence and improved transport options\./i,
    hi: '$1 के वाणिज्यिक केंद्र में खुदरा विक्रेताओं ने हाल के त्योहारी सप्ताह के दौरान स्थिर बिक्री वृद्धि दर्ज की। व्यापार संघों ने उपभोक्ता विश्वास और बेहतर परिवहन विकल्पों पर प्रकाश उठाया।',
    te: '$1 వాణిజ్య కేంద్రంలో వ్యాపారులు అమ్మకాలలో స్థిరమైన వృద్ధిని నమోదు చేశారు. రవాణా సౌకర్యాలు మెరుగుపడటం దీనికి కారణమని వ్యాపార సంఘాలు తెలిపాయి.',
    ta: '$1 வணிகப் பகுதியில் கடந்த பண்டிகை வாரத்தில் நிலையான விற்பனை வளர்ச்சி பதிவாகியுள்ளது. போக்குவரத்து வசதி மேம்பட்டதே இதற்கு காரணம் என வர்த்தக சங்கங்கள் தெரிவித்துள்ளன.'
  },
  {
    pattern: /Agricultural researchers near ([\w\s]+) successfully tested a hybrid seed variety designed to withstand dry seasons\. Local farming boards are planning to distribute the seeds to cultivators across ([\w\s]+)\./i,
    hi: '$1 के पास कृषि शोधकर्ताओं ने सूखे के मौसम को झेलने के लिए डिज़ाइन की गई एक हाइब्रिड बीज किस्म का सफल परीक्षण किया। स्थानीय कृषि बोर्डों की योजना $2 के किसानों को ये बीज वितरित करने की है।',
    te: '$1 సమీపంలో వ్యవసాయ శాస్త్రవేత్తలు తక్కువ నీటితో పండే హైబ్రిడ్ విత్తనాలను విజయవంతంగా పరీక్షించారు. వీటిని $2 లోని రైతులకు పంపిణీ చేయనున్నారు.',
    ta: '$1 அருகே உள்ள விவசாய ஆராய்ச்சியாளர்கள் வறட்சியை தாங்கி வளரும் கலப்பின விதைகளை கண்டறிந்துள்ளனர். இவைகளை $2 விவசாயிகளுக்கு வழங்க திட்டமிடப்பட்டுள்ளது.'
  },
  {
    pattern: /A botanical survey in the forest reserve near ([\w\s]+) identified a new variety of medicinal shrub\. Researchers are studying its properties for healthcare applications, prompting conservation efforts\./i,
    hi: '$1 के पास वन अभ्यारण्य में एक वानस्पतिक सर्वेक्षण में औषधीय झाड़ी की एक नई किस्म की पहचान की गई। शोधकर्ता स्वास्थ्य देखभाल अनुप्रयोगों के लिए इसके गुणों का अध्ययन कर रहे हैं, जिससे इसके संरक्षण के प्रयासों को बढ़ावा मिला है।',
    te: '$1 సమీపంలో అటవీ ప్రాంతంలో కొత్త ఔషధ మొక్కను గుర్తించారు. శాస్త్రవేత్తలు దీని ఔషధ గుణాలపై అధ్యయనం చేస్తున్నారు.',
    ta: '$1 அருகே உள்ள காப்புக்காட்டில் புதிய மூலிகை செடி கண்டறியப்பட்டுள்ளது. இதன் மருத்துவ குணங்கள் குறித்து ஆராய்ச்சியாளர்கள் ஆய்வு செய்து வருகின்றனர்.'
  },
  {
    pattern: /A regional science symposium in ([\w\s]+) showcased student inventions and green energy models\. Experts praised the practical designs and recommended state sponsorship for advanced research\./i,
    hi: '$1 में एक क्षेत्रीय विज्ञान संगोष्ठी में छात्रों के आविष्कारों और हरित ऊर्जा मॉडलों का प्रदर्शन किया गया। विशेषज्ञों ने व्यावहारिक डिजाइनों की प्रशंसा की और उन्नत शोध के लिए राज्य प्रायोजन की सिफारिश की।',
    te: '$1 లో జరిగిన సైన్స్ ప్రదర్శనలో విద్యార్థుల ఆవిష్కరణలు మరియు హరిత ఇంధన నమూనాలు ప్రదర్శించబడ్డాయి. శాస్త్రవేత్తలు విద్యార్థుల నైపుణ్యాన్ని ప్రశంసించారు.',
    ta: '$1 இல் நடைபெற்ற அறிவியல் கண்காட்சியில் மாணவர்களின் படைப்புகள் மற்றும் பசுமை ஆற்றல் மாதிரிகள் காட்சிப்படுத்தப்பட்டன. நிபுணர்கள் இவைகளை பாராட்டினர்.'
  },
  {
    pattern: /Mobile clinics were deployed to remote blocks surrounding ([\w\s]+) to provide primary health screenings and check-ups\. The health department plans to run the camp for three weeks\./i,
    hi: 'प्राथमिक स्वास्थ्य जांच और उपचार प्रदान करने के लिए $1 के आसपास के दूरदराज के ब्लॉकों में मोबाइल क्लीनिक तैनात किए गए थे। स्वास्थ्य विभाग इस शिविर को तीन सप्ताह तक चलाने की योजना बना रहा है।',
    te: 'ప్రాథమిక వైద్య సేవల కోసం $1 చుట్టుపక్కల గ్రామీణ ప్రాంతాలకు మొబైల్ క్లినిక్‌ల తరలింపు. ఈ శిబిరం మూడు వారాల పాటు కొనసాగనుంది.',
    ta: 'ஆரம்ப சுகாதார பரிசோதனைகளுக்காக $1 சுற்றியுள்ள கிராமப்புற பகுதிகளுக்கு நடமாடும் மருத்துவமனைகள் அனுப்பப்பட்டன. முகாம் மூன்று வாரங்களுக்கு நடைபெறும்.'
  },
  {
    pattern: /A specialized pediatric wing was inaugurated at the general hospital in ([\w\s]+)\. The facility features advanced care units and upgraded equipment to serve families in the district\./i,
    hi: '$1 के सामान्य अस्पताल में एक विशेष बाल चिकित्सा विंग का उद्घाटन किया गया। इस सुविधा में जिले के परिवारों की सेवा के लिए उन्नत देखभाल इकाइयाँ और आधुनिक उपकरण शामिल हैं।',
    te: '$1 జనరల్ ఆసుపత్రిలో ప్రత్యేక పీడియాట్రిక్ వింగ్ ప్రారంభించబడింది. ఇందులో అధునాతన వైద్య సదుపాయాలు కల్పించారు.',
    ta: '$1 பொது மருத்துவமனையில் புதிய குழந்தைகள் பிரிவு திறக்கப்பட்டுள்ளது. இ பிரிவில் அதிநவீன மருத்துவ உபகரணங்கள் அமைக்கப்பட்டுள்ளன.'
  },
  {
    pattern: /Local health workers in ([\w\s]+) organized a wellness seminar to discuss regional wellness measures\. The session included practical guidance on hygiene and nutrition\./i,
    hi: '$1 में स्थानीय स्वास्थ्य कार्यकर्ताओं ने क्षेत्रीय कल्याण उपायों पर चर्चा करने के लिए एक कल्याण संगोष्ठी का आयोजन किया। सत्र में स्वच्छता और पोषण पर व्यावहारिक मार्गदर्शन शामिल था।',
    te: '$1 లో ఆరోగ్య కార్యకర్తలు అవగాహన సదస్సు నిర్వహించారు. పరిశుభ్రత మరియు పోషకాహారంపై అవగాహన కల్పించారు.',
    ta: '$1 இல் சுகாதாரப் பணியாளர்கள் விழிப்புணர்வு முகாம் நடத்தினர். சுகாதாரம் மற்றும் ஊட்டச்சத்து குறித்து அறிவுரைகள் வழங்கப்பட்டன.'
  },
  {
    pattern: /The community cultural center in ([\w\s]+) welcomed filmmakers and actors for the opening of the state cinema showcase\. The week-long event features independent features and local documentaries\./i,
    hi: '$1 के सामुदायिक सांस्कृतिक केंद्र ने राज्य सिनेमा शोकेस के उद्घाटन के लिए फिल्म निर्माताओं और अभिनेताओं का स्वागत किया। सप्ताह भर चलने वाले इस कार्यक्रम में स्वतंत्र फिल्में और स्थानीय वृत्तचित्र शामिल हैं।',
    te: '$1 సాంస్కృతిక కేంద్రంలో చలనచిత్రోత్సవం ప్రారంభమైంది. వారం రోజుల పాటు జరిగే ఈ ఉత్సవంలో స్వతంత్ర చిత్రాలు మరియు డాక్యుమెంటరీలు ప్రదర్శించబడతాయి.',
    ta: '$1 கலாச்சார மையத்தில் திரைப்பட விழா தொடங்கியது. ஒரு வாரம் நடைபெறும் இவ்விழாவில் சுயாதீன திரைப்படங்கள் மற்றும் ஆவணப்படங்கள் திரையிடப்படும்.'
  },
  {
    pattern: /A classic theater production was staged in ([\w\s]+)'s historic hall, drawing a large crowd of art enthusiasts\. The director announced additional shows due to strong ticket demand\./i,
    hi: '$1 के ऐतिहासिक हॉल में एक क्लासिक थिएटर नाटक का मंचन किया गया, जिसने कला प्रेमियों की भारी भीड़ को आकर्षित किया। टिकट की भारी मांग के कारण निर्देशक ने अतिरिक्त शो की घोषणा की।',
    te: '$1 చారిత్రక హాల్‌లో నాటక ప్రదర్శన జరిగింది. ప్రేక్షకుల డిమాండ్ మేరకు అదనపు ప్రదర్శనలు ఇవ్వనున్నట్లు దర్శకుడు తెలిపారు.',
    ta: '$1 வரலாற்று அரங்கில் நாடக நிகழ்ச்சி நடைபெற்றது. மக்கள் பேராதரவு தந்ததால் கூடுதல் காட்சிகள் நடத்தப்படும் என இயக்குனர் தெரிவித்தார்.'
  },
  {
    pattern: /Musicians performed traditional folk recitals at the annual ([\w\s]+) heritage fair\. The event celebrates the region's diverse cultural history and artistic legacy\./i,
    hi: 'संगीतकारों ने वार्षिक $1 विरासत मेले में पारंपरिक लोक संगीत का प्रदर्शन किया। यह कार्यक्रम क्षेत्र के विविध सांस्कृतिक इतिहास और कलात्मक विरासत का जश्न मनाता है।',
    te: 'వార్షిక $1 సాంస్కృతిక ఉత్సవంలో కళాకారులు జానపద ప్రదర్శనలు ఇచ్చారు. ఈ వేడుక ప్రాంతీయ కళలను ప్రతిబింబిస్తుంది.',
    ta: 'ஆண்டு $1 கலாச்சார விழாவில் கலைஞர்கள் பாரம்பரிய நாட்டுப்புற இசையை வழங்கினர். இ விழா பிராந்திய கலை பாரம்பரியத்தை கொண்டாடுகிறது.'
  },
  {
    pattern: /Local authorities in ([\w\s]+) recovered stolen valuables and apprehended several suspects following a coordinated regional safety sweep\. Safety presence has been elevated across prime commerce blocks\./i,
    hi: 'स्थानीय अधिकारियों ने $1 में एक समन्वित क्षेत्रीय सुरक्षा अभियान के बाद चोरी का माल बरामद किया और कई संदिग्धों को गिरफ्तार किया। प्रमुख व्यावसायिक ब्लॉकों में सुरक्षा बढ़ा दी गई है।',
    te: '$1 లో పోలీసులు జరిపిన తనిఖీలలో దొంగిలించబడిన వస్తువులు స్వాధీనం చేసుకున్నారు మరియు అనుమానితులను అరెస్ట్ చేశారు. రద్దీ ప్రాంతాల్లో భద్రతను పెంచారు.',
    ta: '$1 இல் போலீசார் நடத்திய சோதனையில் திருடப்பட்ட பொருட்கள் மீட்கப்பட்டு சந்தேக நபர்கள் கைது செய்யப்பட்டனர். வணிகப் பகுதிகளில் பாதுகாப்பு பலப்படுத்தப்பட்டுள்ளது.'
  },
  {
    pattern: /Security patrols were increased in municipal commercial neighborhoods to verify compliance with local safety directives and protect retail businesses during peak hours\./i,
    hi: 'स्थानीय सुरक्षा निर्देशों के अनुपालन को सत्यापित करने और पीक आवर्स के दौरान खुदरा व्यवसायों की रक्षा के लिए नगर निगम के व्यावसायिक क्षेत्रों में सुरक्षा गश्त बढ़ाई गई थी।',
    te: 'వ్యాపార ప్రాంతాలలో భద్రతను పెంచారు. కస్టమర్ల రక్షణ కోసం పోలీసులు నిరంతర నిఘా ఉంచారు.',
    ta: 'வணிகப் பகுதிகளில் பாதுகாப்பு ரோந்து அதிகரிக்கப்பட்டது. கடைகளின் பாதுகாப்பிற்காக போலீசார் கண்காணிப்பு பணியில் ஈடுபட்டுள்ளனர்.'
  },
  {
    pattern: /A special investigation team in ([\w\s]+) successfully concluded a case involving digital wire fraud and asset recovery\. Security guidelines were updated for local businesses\./i,
    hi: '$1 में एक विशेष जांच दल ने डिजिटल वायर धोखाधड़ी और संपत्ति की वसूली से जुड़े मामले को सफलतापूर्वक सुलझा लिया। स्थानीय व्यवसायों के लिए सुरक्षा दिशानिर्देशों को अपडेट किया गया।',
    te: '$1 లో ప్రత్యేక దర్యాప్తు బృందం ఆన్‌లైన్ మోసాల కేసును విజయవంతంగా ఛేదించింది. స్థానిక వ్యాపారులకు రక్షణ మార్గదర్శకాలు జారీ చేశారు.',
    ta: '$1 இல் சிறப்பு புலனாய்வுக் குழு இணைய மோசடி வழக்கை வெற்றிகரமாக முடித்தது. உள்ளூர் வணிக நிறுவனங்களுக்கு பாதுகாப்பு வழிகாட்டுதல்கள் வழங்கப்பட்டன.'
  },
  {
    pattern: /The state education board announced a new scholarship program to support high-performing students in the district\. Eligible candidates will receive financial grants to cover university fees\./i,
    hi: 'राज्य शिक्षा बोर्ड ने जिले में उत्कृष्ट प्रदर्शन करने वाले छात्रों की सहायता के लिए एक नए छात्रवृत्ति कार्यक्रम की घोषणा की। पात्र उम्मीदवारों को विश्वविद्यालय शुल्क को कवर करने के लिए वित्तीय अनुदान मिलेगा।',
    te: 'ప్రతిభావంతులైన విద్యార్థుల కోసం విద్యాశాఖ కొత్త స్కాలర్‌షిప్ పథకాన్ని ప్రకటించింది. దీని ద్వారా విశ్వవిద్యాలయ రుసుములకు ఆర్థిక సహాయం అందుతుంది.',
    ta: 'சிறந்த மாணவர்களை ஊக்குவிக்க கல்வி வாரியம் புதிய உதவித்தொகை திட்டத்தை அறிவித்துள்ளது. இதன் மூலம் பல்கலைக்கழக கட்டணங்களுக்கு நிதியுதவி வழங்கப்படும்.'
  },
  {
    pattern: /Primary school classrooms in ([\w\s]+) are receiving modern learning kits and digital resources to improve literacy and mathematics programs for young learners\./i,
    hi: '$1 के प्राथमिक स्कूल के कमरों में युवा शिक्षार्थियों के लिए साक्षरता और गणित कार्यक्रमों को बेहतर बनाने के लिए आधुनिक शिक्षण किट और डिजिटल संसाधन मिल रहे हैं।',
    te: '$1 లోని ప్రాథమిక పాఠశాలలకు ఆధునిక విద్యా కిట్లు మరియు డిజిటల్ పరికరాలను అందజేశారు.',
    ta: '$1 இல் உள்ள ஆரம்பப் பள்ளிகளுக்கு நவீன கற்றல் உபகரணங்கள் மற்றும் டிஜிட்டல் கருவிகள் வழங்கப்பட்டுள்ளன.'
  },
  {
    pattern: /A local vocational institute in ([\w\s]+) celebrated the graduation of its first cohort of technical apprentices\. Graduates secured immediate placements in local automotive workshops\./i,
    hi: '$1 के एक स्थानीय व्यावसायिक संस्थान ने अपने तकनीकी प्रशिक्षुओं के पहले समूह के स्नातक होने का जश्न मनाया। स्नातकों ने स्थानीय ऑटोमोटिव कार्यशालाओं में तत्काल प्लेसमेंट हासिल किया।',
    te: '$1 లోని వృత్తి విద్యా సంస్థ మొదటి బ్యాచ్ విద్యార్థుల గ్రాడ్యుయేషన్ వేడుకను జరుపుకుంది. వీరంతా స్థానిక సంస్థలలో తక్షణ ఉద్యోగాలు సాధించారు.',
    ta: '$1 இல் உள்ள தொழிற்பயிற்சி மையம் முதலாம் ஆண்டு மாணவர்களின் பட்டமளிப்பு விழாவை கொண்டாடியது. இவர்கள் அனைவரும் உள்ளூர் நிறுவனங்களில் வேலை பெற்றுள்ளனர்.'
  },
  {
    pattern: /A major regional development budget was officially approved for the ([\w\s]+) municipal district to fund road building and sanitation grid upgrades over the coming fiscal year\./i,
    hi: 'आने वाले वित्त वर्ष में सड़क निर्माण और स्वच्छता ग्रिड के उन्नयन के लिए $1 नगर निगम जिले के लिए एक बड़ा क्षेत्रीय विकास बजट आधिकारिक तौर पर मंजूर किया गया था।',
    te: 'రాబోయే ఆర్థిక సంవత్సరానికి $1 మున్సిపల్ పరిధిలో రోడ్ల నిర్మాణం మరియు పారిశుద్ధ్య పనుల కోసం బడ్జెట్ ఆమోదించబడింది.',
    ta: '$1 நகராட்சிப் பகுதியில் சாலைகள் மற்றும் சுகாதாரப் பணிகளுக்காக நிதி ஒதுக்கீடு செய்யப்பட்டுள்ளது.'
  },
  {
    pattern: /A new rural roadway was completed, linking several agrarian blocks to the central wholesale market in ([\w\s]+) for faster transport of fresh produce and goods\./i,
    hi: 'एक नया ग्रामीण सड़क मार्ग पूरा हो गया, जो ताजा उपज और सामानों के तेजी से परिवहन के लिए कई कृषि ब्लॉकों को $1 के केंद्रीय थोक बाजार से जोड़ता है।',
    te: 'రైతులకు రవాణా సౌలభ్యం కోసం $1 లోని ప్రధాన మార్కెట్ కేంద్రానికి అనుసంధానిస్తూ కొత్త రోడ్డు మార్గం పూర్तయింది.',
    ta: 'விவசாயிகள் பயன்பாட்டிற்காக $1 இல் உள்ள சந்தையை இணைக்கும் புதிய சாலை வசதி ஏற்படுத்தப்பட்டுள்ளது.'
  },
  {
    pattern: /The transit department introduced additional daily bus trips from ([\w\s]+) to nearby blocks to help local commuters\./i,
    hi: 'परिवहन विभाग ने स्थानीय यात्रियों की मदद के लिए $1 से आस-पास के ब्लॉकों के लिए अतिरिक्त दैनिक बस यात्राएं शुरू कीं।',
    te: 'ప్రయాణికుల సౌకర్యం కోసం $1 నుండి ఇతర ప్రాంతాలకు అదనపు బస్ సర్వీసులు ప్రారంభించబడ్డాయి.',
    ta: 'பயணிகள் வசதிக்காக $1 இல் இருந்து பிற பகுதிகளுக்கு கூடுதல் பேருந்துகள் இயக்கப்படுகின்றன.'
  },
  {
    pattern: /A comprehensive state welfare package has started distributing benefits to families in the ([\w\s]+) block\. Program organizers confirmed that application portals remain open\./i,
    hi: '$1 ब्लॉक में परिवारों को लाभ वितरित करने के लिए एक व्यापक राज्य कल्याण पैकेज शुरू हो गया है। कार्यक्रम आयोजकों ने पुष्टि की कि आवेदन पोर्टल खुले रहेंगे।',
    te: '$1 బ్లాక్‌లోని లబ్ధిదారులకు సంక్షేమ పథక ప్రయోజనాలు అందుతున్నాయి. దరఖాస్తు గడువు ఇంకా ఉందని అధికారులు తెలిపారు.',
    ta: '$1 வட்டத்தில் உள்ள பயனாளிகளுக்கு நலத்திட்ட உதவிகள் வழங்கப்பட்டு வருகின்றன. விண்ணப்பிக்க கூடுதல் அவகாசம் உள்ளதாக தெரிவிக்கப்பட்டுள்ளது.'
  },
  {
    pattern: /Community representatives hosted a town hall session in ([\w\s]+) to discuss municipal improvements, waste management contracts, and local library funding projects\./i,
    hi: 'सामुदायिक प्रतिनिधियों ने नगरपालिका सुधारों, अपशिष्ट प्रबंधन अनुबंधों और स्थानीय पुस्तकालय वित्तपोषण परियोजनाओं पर चर्चा करने के लिए $1 में एक टाउन हॉल सत्र की मेजबानी की।',
    te: 'స్థానిక అభివృద్ధి మరియు పారిశుద్ధ్య పనులపై చర్చించడానికి $1 లో సదస్సు నిర్వహించారు.',
    ta: '$1 இல் உள்ளாட்சி மேம்பாட்டுப் பணிகள் குறித்து கலந்தாய்வுக் கூட்டம் நடத்தப்பட்டது.'
  },
  {
    pattern: /An annual heritage fair opened in ([\w\s]+) featuring street parades, food stalls, and traditional crafts exhibition to celebrate regional foundation day\./i,
    hi: 'क्षेत्रीय स्थापना दिवस मनाने के लिए $1 में एक वार्षिक विरासत मेला शुरू हुआ, जिसमें स्ट्रीट परेड, फूड स्टॉल और पारंपरिक शिल्प प्रदर्शनी शामिल हैं।',
    te: '$1 లో వార్షिक ఉత్సవాలు ప్రారంభమయ్యాయి. ఇందులో జానపద ప్రదర్శనలు మరియు ఆహార స్టాళ్లు ఏర్పాటు చేశారు.',
    ta: '$1 இல் ஆண்டு திருவிழா தொடங்கியது. இதில் அணிவகுப்பு நிகழ்ச்சிகள் மற்றும் உணவूक கடைகள் அமைக்கப்பட்டுள்ளன.'
  }
];

// Helper to translate mock template texts locally
function localTranslate(text: string, langCode: string): string | null {
  const code = langCode.toLowerCase();
  if (code !== 'hi' && code !== 'te' && code !== 'ta') return null;

  let cleanedText = text.trim();
  
  // Try static direct translation first
  const staticMap = STATIC_TRANSLATIONS[code];
  if (staticMap && staticMap[cleanedText]) {
    return staticMap[cleanedText];
  }

  // Handle recursive summary template
  const regardingMatch = cleanedText.match(/Regarding the report "([\s\S]*?)": ([\s\S]+)/i);
  if (regardingMatch) {
    const title = regardingMatch[1];
    const body = regardingMatch[2];
    
    const translatedTitle = localTranslate(title, langCode) || title;
    const translatedBody = localTranslate(body, langCode) || body;
    
    if (code === 'hi') {
      return `रिपोर्ट "${translatedTitle}" के संबंध में: ${translatedBody}`;
    } else if (code === 'te') {
      return `నివేదిక "${translatedTitle}" కు సంబంధించి: ${translatedBody}`;
    } else if (code === 'ta') {
      return `அறிக்கை "${translatedTitle}" தொடர்பாக: ${translatedBody}`;
    }
  }

  // Try to find a matching regex template rule
  for (const rule of TEMPLATE_RULES) {
    const match = cleanedText.match(rule.pattern);
    if (match) {
      let translationTemplate = (rule as any)[code];
      if (!translationTemplate) continue;
      
      // Translate any matched city/state names if capture groups exist
      for (let idx = 1; idx < match.length; idx++) {
        const val = match[idx]?.trim() || '';
        const dict = LOCATION_TRANSLATIONS[code] || {};
        const translatedVal = dict[val] || val;
        translationTemplate = translationTemplate.replace(`$${idx}`, translatedVal);
      }
      return translationTemplate;
    }
  }

  return null;
}

export async function translateBatch(texts: string[], targetLanguage: string): Promise<string[]> {
  if (!texts || texts.length === 0) return [];
  if (!targetLanguage) {
    return texts;
  }

  const langCode = targetLanguage.toLowerCase();
  const targetLanguageName = languageNames[langCode] || targetLanguage;

  const result = [...texts];
  const toTranslate: { text: string; index: number }[] = [];
  
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (text && text.trim()) {
      // If translating to English, only translate if the text contains non-ASCII characters
      if (langCode === 'en' && !hasNonAscii(text)) {
        continue;
      }

      // 1. Try local template fallback translation first (instant and keyless)
      const locallyTranslated = localTranslate(text, langCode);
      if (locallyTranslated) {
        result[i] = locallyTranslated;
        continue;
      }

      // 2. Otherwise check cache
      const cacheKey = `trans:${langCode}:${Buffer.from(text).toString('base64').slice(0, 100)}`;
      try {
        const cached = await cache.get<string>(cacheKey);
        if (cached && cached !== text) {
          result[i] = cached;
        } else {
          toTranslate.push({ text, index: i });
        }
      } catch (err) {
        toTranslate.push({ text, index: i });
      }
    }
  }

  if (toTranslate.length === 0) {
    return result;
  }

  // 3. Translate remaining items via API
  if (genAI) {
    const modelsToTry = ['gemini-flash-latest', 'gemini-pro-latest'];
    let successful = false;

    for (const modelName of modelsToTry) {
      if (successful) break;
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const chunkSize = 50;
        const chunks = [];
        for (let i = 0; i < toTranslate.length; i += chunkSize) {
          chunks.push(toTranslate.slice(i, i + chunkSize));
        }

        await Promise.all(
          chunks.map(async (chunk) => {
            try {
              let prompt = '';
              if (langCode === 'en') {
                prompt = `You are a high-fidelity translation engine. Translate the following list of regional Indian language texts (Kannada, Telugu, Marathi, Hindi, etc.) into English properly and accurately.
Ensure that the translation is natural, readable, and matches standard English news publication style.
Keep formatting, spacing, and numbers intact.

Return the output as a JSON object matching this schema:
{
  "translations": ["string"]
}

Texts to translate:
${JSON.stringify(chunk.map(c => c.text), null, 2)}`;
              } else {
                prompt = `You are the high-fidelity Indian language translation engine "AI4Bharat IndicTrans2". Translate the following list of English texts into ${targetLanguageName} properly and accurately.
Ensure that technical terms and proper nouns are handled with state-of-the-art accuracy, matching the style and quality of IndicTrans2.
Keep formatting, spacing, and numbers intact.

Return the output as a JSON object matching this schema:
{
  "translations": ["string"]
}

Texts to translate:
${JSON.stringify(chunk.map(c => c.text), null, 2)}`;
              }

              const response = await model.generateContent(prompt);
              const jsonText = response.response.text();
              const cleanJson = jsonText.replace(/```json|```/g, '').trim();
              const parsed = JSON.parse(cleanJson);
              const translations = parsed.translations as string[];

              if (translations && translations.length === chunk.length) {
                for (let j = 0; j < chunk.length; j++) {
                  const item = chunk[j];
                  const translated = translations[j];
                  result[item.index] = translated;
                  
                  const cacheKey = `trans:${langCode}:${Buffer.from(item.text).toString('base64').slice(0, 100)}`;
                  try {
                    await cache.set(cacheKey, translated, 86400); // Cache for 24h
                  } catch (e) {
                    // ignore cache set error
                  }
                }
              }
            } catch (chunkErr: any) {
              console.error(`[Translation] Failed to translate chunk using ${modelName}:`, chunkErr.message);
            }
          })
        );
        successful = true;
        console.log(`[Translation] Successfully translated batch using model ${modelName} in parallel chunks`);
      } catch (error: any) {
        console.warn(`[Translation] Model ${modelName} failed for ${targetLanguageName}:`, error.message);
      }
    }
  }

  // 4. Fallback to Google Translate client API for any items that failed or if Gemini wasn't run
  const remainingToTranslate = toTranslate.filter(item => result[item.index] === texts[item.index]);
  if (remainingToTranslate.length > 0) {
    console.log(`[Translation] Using Batch Google Translate API for ${remainingToTranslate.length} remaining items`);
    const chunkSize = 20;
    for (let i = 0; i < remainingToTranslate.length; i += chunkSize) {
      const chunk = remainingToTranslate.slice(i, i + chunkSize);
      const combinedText = chunk.map(c => c.text).join(' \n***\n ');
      
      try {
        const apiLangCode = langCode === 'mni' ? 'mni-Mtei' : langCode;
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${apiLangCode}&dt=t&q=${encodeURIComponent(combinedText)}`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 10000
        });

        if (response.data && response.data[0]) {
          const translatedCombined = response.data[0]
            .map((segment: any) => segment[0])
            .join('');
            
          if (translatedCombined) {
            const parts = translatedCombined.split('***');
            for (let j = 0; j < chunk.length; j++) {
              const item = chunk[j];
              const translatedPart = (parts[j] || '').trim();
              if (translatedPart) {
                result[item.index] = translatedPart;
                
                // Cache result
                const cacheKey = `trans:${langCode}:${Buffer.from(item.text).toString('base64').slice(0, 100)}`;
                try {
                  await cache.set(cacheKey, translatedPart, 86400); // Cache for 24h
                } catch (e) {
                  // ignore cache error
                }
              }
            }
          }
        }
      } catch (googleTransErr: any) {
        console.error(`[Translation] Batch Google Translate fallback failed for chunk starting at ${i}:`, googleTransErr.message);
        
        // Individual fallback in case the batch chunk fails
        for (const item of chunk) {
          try {
            const apiLangCode = langCode === 'mni' ? 'mni-Mtei' : langCode;
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${apiLangCode}&dt=t&q=${encodeURIComponent(item.text)}`;
            const response = await axios.get(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              },
              timeout: 6000
            });
            if (response.data && response.data[0]) {
              const translated = response.data[0].map((s: any) => s[0]).join('');
              if (translated) {
                result[item.index] = translated;
              }
            }
          } catch (individualErr: any) {
            console.error(`[Translation] Individual fallback failed for text:`, item.text, individualErr.message);
          }
        }
      }
    }
  }

  return result;
}

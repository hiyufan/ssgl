// Mock data — Competition Management Platform
const mockData = (() => {
  const users = {
    admin:   { id:1, name:'刘志远', role:'admin',   avatar:'刘', dept:'教务处管理中心',   email:'liuzy@univ.edu.cn'  },
    teacher: { id:2, name:'王建国', role:'teacher',  avatar:'王', dept:'计算机科学学院',   email:'wangjg@univ.edu.cn' },
    student: { id:3, name:'张明',   role:'student',  avatar:'张', dept:'软件工程 2023级',  email:'zhangm@stu.edu.cn'  },
  };

  const competitions = [
    { id:1, title:'2026 华为 ICT 创新大赛', type:'hackathon', typeName:'黑客马拉松',
      status:'ongoing', statusName:'进行中',
      desc:'面向全国高校学生的ICT创新竞赛，聚焦云计算、人工智能、大数据领域创新实践，鼓励参赛者打造具有实际价值的创新解决方案。',
      registrationDeadline:'2026-06-30', startDate:'2026-07-01', endDate:'2026-08-31',
      location:'线上初赛 + 深圳总决赛', maxTeam:5, minTeam:2, teamsCount:12, prize:'总奖金 ¥500,000',
      tags:['云计算','AI','大数据'], organizer:'刘志远' },
    { id:2, title:'第八届互联网+大学生创新创业大赛', type:'innovation', typeName:'创新创业',
      status:'published', statusName:'报名中',
      desc:'教育部主办的全国性大学生创新创业赛事，鼓励青年学生将创意转化为商业价值，孵化优质创业项目，推动产学研深度融合。',
      registrationDeadline:'2026-07-15', startDate:'2026-08-01', endDate:'2026-10-31',
      location:'北京·清华大学', maxTeam:6, minTeam:3, teamsCount:8, prize:'总奖金 ¥1,000,000',
      tags:['创新','创业','商业计划'], organizer:'刘志远' },
    { id:3, title:'挑战杯学术科技作品竞赛', type:'research', typeName:'学术科技',
      status:'draft', statusName:'草稿',
      desc:'全国性学术竞赛，涵盖自然科学、哲学社会科学、科技发明等多个领域，培养学生创新精神和实践能力。',
      registrationDeadline:'2026-09-01', startDate:'2026-10-01', endDate:'2026-12-31',
      location:'待定', maxTeam:5, minTeam:2, teamsCount:0, prize:'待定',
      tags:['学术','科技','创新'], organizer:'刘志远' },
    { id:4, title:'字节跳动青年技术训练营', type:'hackathon', typeName:'黑客马拉松',
      status:'completed', statusName:'已完成',
      desc:'字节跳动主办，聚焦移动应用和内容技术创新，连接产业与人才，为优秀学生提供进入顶级互联网公司的通道。',
      registrationDeadline:'2026-03-31', startDate:'2026-04-01', endDate:'2026-05-31',
      location:'北京·字节跳动总部', maxTeam:4, minTeam:2, teamsCount:15, prize:'总奖金 ¥300,000',
      tags:['移动','内容','技术'], organizer:'刘志远' },
    { id:5, title:'百度 AI 开发者创新马拉松', type:'hackathon', typeName:'黑客马拉松',
      status:'completed', statusName:'已完成',
      desc:'百度主办，聚焦AI应用开发，鼓励参赛者利用百度AI平台构建具有创新价值的应用产品，探索AI商业化落地路径。',
      registrationDeadline:'2026-02-28', startDate:'2026-03-01', endDate:'2026-04-30',
      location:'线上', maxTeam:4, minTeam:2, teamsCount:22, prize:'总奖金 ¥200,000',
      tags:['AI','开发','百度平台'], organizer:'刘志远' },
  ];

  const teams = [
    { id:1, name:'量子跃迁',    compId:1, compName:'华为ICT',    status:'active',    members:4, leader:'张明',  teacher:'王建国', score:null, rank:null, myTeam:true  },
    { id:2, name:'代码改变世界', compId:2, compName:'互联网+',    status:'active',    members:3, leader:'李芳',  teacher:'陈晓梅', score:null, rank:null, myTeam:false },
    { id:3, name:'智能未来',    compId:2, compName:'互联网+',    status:'active',    members:4, leader:'刘洋',  teacher:'王建国', score:null, rank:null, myTeam:false },
    { id:4, name:'破晓战队',    compId:4, compName:'字节青年营', status:'completed', members:3, leader:'赵磊',  teacher:'王建国', score:92,   rank:1,    myTeam:false },
    { id:5, name:'StarDust',    compId:5, compName:'百度AI',     status:'completed', members:4, leader:'孙浩',  teacher:'陈晓梅', score:95,   rank:1,    myTeam:false },
    { id:6, name:'创新引擎',    compId:1, compName:'华为ICT',    status:'active',    members:4, leader:'周静',  teacher:'李明远', score:null, rank:null, myTeam:false },
  ];

  const myTeamMembers = [
    { id:3, name:'张明', role:'leader', dept:'软件工程', skills:['React','Python','AI/ML'],    joined:'2026-06-01' },
    { id:4, name:'李云', role:'member', dept:'数据科学', skills:['数据分析','Pandas','Spark'],  joined:'2026-06-02' },
    { id:5, name:'赵晓', role:'member', dept:'人工智能', skills:['深度学习','NLP','CV'],        joined:'2026-06-02' },
    { id:6, name:'陈宇', role:'member', dept:'计算机科学',skills:['Go','PostgreSQL','Redis'],   joined:'2026-06-03' },
  ];

  const aiReviews = {
    1: { score:78, reviewedAt:'2026-06-06 14:35',
      breakdown:{ feasibility:80, innovation:75, completeness:82, marketFit:70 },
      summary:'项目整体可行，技术路线清晰，围绕智慧校园场景构建AI服务平台具有现实需求。但市场分析部分深度不足，建议加强竞品分析和目标用户画像，商业模式有待进一步论证。',
      suggestions:[
        { category:'市场分析', priority:'high',   content:'建议补充详细的目标用户画像和竞品对比矩阵，明确差异化竞争优势，目前市场分析缺乏定量数据支撑。' },
        { category:'技术方案', priority:'medium', content:'技术选型合理，建议增加系统可扩展性设计说明，重点考虑高并发场景下的性能保障方案。' },
        { category:'商业模式', priority:'medium', content:'建议明确收益来源和商业化路径，增强项目可持续性论证，可参考 SaaS 模式或政府采购路径。' },
      ],
      similar:[
        { title:'2024获奖：智能校园综合服务平台', sim:82, year:2024 },
        { title:'2023优秀：AI助手驱动的高校管理系统', sim:68, year:2023 },
      ] },
    2: { score:85, reviewedAt:'2026-06-04 10:38',
      breakdown:{ feasibility:88, innovation:85, completeness:83, marketFit:84 },
      summary:'项目聚焦双碳目标，社会价值显著。技术路线结合IoT传感器与AI能耗预测，创新性较强。市场前景良好，商业模式较为清晰，整体质量高于平均水平。',
      suggestions:[
        { category:'数据方案', priority:'medium', content:'建议详细说明训练数据来源和数据质量保障方案，传感器数据的清洗和异常检测策略需要补充。' },
        { category:'落地路径', priority:'low',    content:'建议细化产品落地路径，说明与学校基建部门合作的具体推进计划和时间节点。' },
      ],
      similar:[
        { title:'2025优秀：高校能源数字化管理平台', sim:74, year:2025 },
      ] },
    3: { score:62, reviewedAt:'2026-06-02 14:15',
      breakdown:{ feasibility:65, innovation:72, completeness:55, marketFit:58 },
      summary:'项目创意有一定新颖性，但整体完整性不足。技术可行性论证薄弱，市场分析缺乏定量数据支撑，建议大幅完善后重新提交。',
      suggestions:[
        { category:'完整性',   priority:'high',   content:'预计划框架不完整，缺少风险分析、时间规划和团队分工等关键部分，必须补充。' },
        { category:'技术方案', priority:'high',   content:'AR技术选型需要更详细论证，建议说明所用ARCore/ARKit版本和具体渲染实现方案。' },
        { category:'市场分析', priority:'medium', content:'仅凭主观判断描述市场，建议引入调研数据或公开报告支撑市场规模判断。' },
      ],
      similar:[] },
  };

  const prePlans = [
    { id:1, teamId:1, teamName:'量子跃迁', compId:1, compName:'华为ICT创新大赛',
      title:'AI驱动的智慧校园服务平台', status:'under_review', submittedAt:'2026-06-06 14:20',
      techStack:'React + Go + Python + PostgreSQL + pgvector + 大模型API (Claude/GPT)',
      targetAudience:'高校师生（日活5000+）、校园管理人员、图书馆工作人员',
      marketAnalysis:'国内高校数字化转型加速，智慧校园市场规模预计2026年超1000亿元，年增速约18%。当前各高校普遍存在信息孤岛问题，统一AI入口有较大需求。',
      innovation:'结合RAG技术和校园专属知识库，实现精准校园智能问答和个性化服务推荐，知识库涵盖课程、规章、校园活动等多维度数据。',
      expectedOutcome:'完整可运行的智慧校园平台，支持5个核心场景：智能问答、课程推荐、场地预订、失物招领、校园通知。',
      timeline:'第1-2周需求与UI设计，第3-6周核心功能开发，第7-8周联调测试和优化。',
      aiReview: aiReviews[1] },
    { id:2, teamId:3, teamName:'智能未来', compId:2, compName:'互联网+大赛',
      title:'碳中和校园能源管理系统', status:'approved', submittedAt:'2026-06-04 10:15',
      techStack:'Vue3 + TypeScript + Node.js + Python + InfluxDB + TensorFlow Lite',
      targetAudience:'高校能源管理部门、后勤处、环保社团学生群体',
      marketAnalysis:'双碳目标背景下，高校作为能源消耗大户（年均能耗约4000万kWh），节能减排需求迫切，潜在SaaS市场超200亿元。',
      innovation:'结合IoT传感器实时采集数据与LSTM能耗预测模型，实现动态能源调度优化，并提供碳排放可视化看板。',
      expectedOutcome:'覆盖校园主要建筑的能源监控和预测系统，目标降低能耗15%，碳排放减少12%。',
      timeline:'第1-3周IoT方案设计和硬件选型，第4-7周软件系统开发，第8周部署测试。',
      aiReview: aiReviews[2] },
    { id:3, teamId:6, teamName:'创新引擎', compId:1, compName:'华为ICT创新大赛',
      title:'AR增强现实校园导航与信息系统', status:'rejected', submittedAt:'2026-06-02 14:00',
      techStack:'Unity 2023 + ARCore + Swift + Node.js',
      targetAudience:'新生、校园访客',
      marketAnalysis:'校园导航市场有一定需求，AR体验新颖，未来可扩展。',
      innovation:'AR叠加实时校园信息，提供沉浸式导航体验。',
      expectedOutcome:'AR导航应用 MVP，覆盖主要教学楼和功能区。',
      timeline:'8周完成基础功能开发和测试。',
      aiReview: aiReviews[3] },
  ];

  const approvals = [
    { id:1, type:'registration', typeName:'报名审批', status:'pending',
      subject:'量子跃迁 · 申请报名华为ICT创新大赛',
      submitter:'张明', compName:'华为ICT创新大赛', teamName:'量子跃迁',
      currentStep:1, totalSteps:1, createdAt:'2026-06-05 09:30',
      steps:[{ step:1, role:'admin', label:'管理员审核', approver:'刘志远', status:'pending', comment:'', actedAt:null }],
      details:{ teamSize:4, motivation:'我们团队专注云计算和AI领域，此赛事与我们的技术方向高度吻合，希望通过竞赛提升实战能力并拓展视野。' } },
    { id:2, type:'pre_plan', typeName:'预计划审批', status:'teacher_pending',
      subject:'AI驱动的智慧校园服务平台 · 预计划审核',
      submitter:'张明', compName:'华为ICT创新大赛', teamName:'量子跃迁',
      currentStep:1, totalSteps:2, createdAt:'2026-06-06 14:20',
      steps:[
        { step:1, role:'teacher', label:'教师初审', approver:'王建国', status:'pending',  comment:'', actedAt:null },
        { step:2, role:'admin',   label:'管理员终审', approver:'刘志远', status:'waiting',  comment:'', actedAt:null },
      ], aiReviewId:1, prePlanId:1 },
    { id:3, type:'pre_plan', typeName:'预计划审批', status:'admin_pending',
      subject:'碳中和校园能源管理系统 · 预计划审核',
      submitter:'刘洋', compName:'互联网+大赛', teamName:'智能未来',
      currentStep:2, totalSteps:2, createdAt:'2026-06-04 10:15',
      steps:[
        { step:1, role:'teacher', label:'教师初审',  approver:'王建国', status:'approved', comment:'项目思路新颖，技术方案可行，建议补充数据来源说明，整体质量较高。', actedAt:'2026-06-05 16:30' },
        { step:2, role:'admin',   label:'管理员终审', approver:'刘志远', status:'pending',  comment:'', actedAt:null },
      ], aiReviewId:2, prePlanId:2 },
    { id:4, type:'reward', typeName:'奖励审批', status:'teacher_confirm',
      subject:'字节跳动青年技术训练营 · 获奖名单确认',
      submitter:'刘志远', compName:'字节跳动青年技术训练营', teamName:'—',
      currentStep:2, totalSteps:3, createdAt:'2026-06-01 09:00',
      steps:[
        { step:1, role:'admin',   label:'管理员提名', approver:'刘志远', status:'approved', comment:'获奖名单已初步核定，共3支队伍，请教师确认。', actedAt:'2026-06-01 09:00' },
        { step:2, role:'teacher', label:'教师确认',  approver:'王建国', status:'pending',  comment:'', actedAt:null },
        { step:3, role:'admin',   label:'最终核定',  approver:'刘志远', status:'waiting',  comment:'', actedAt:null },
      ], details:{ awardCount:3, totalPrize:'¥170,000' } },
    { id:5, type:'registration', typeName:'报名审批', status:'approved',
      subject:'智能未来 · 申请报名互联网+大赛',
      submitter:'刘洋', compName:'互联网+大赛', teamName:'智能未来',
      currentStep:1, totalSteps:1, createdAt:'2026-06-03 11:00',
      steps:[{ step:1, role:'admin', label:'管理员审核', approver:'刘志远', status:'approved', comment:'团队资质符合要求，审批通过，祝参赛顺利。', actedAt:'2026-06-03 15:30' }] },
    { id:6, type:'pre_plan', typeName:'预计划审批', status:'rejected',
      subject:'AR增强现实校园导航 · 预计划审核',
      submitter:'周静', compName:'华为ICT创新大赛', teamName:'创新引擎',
      currentStep:1, totalSteps:2, createdAt:'2026-06-02 14:00',
      steps:[
        { step:1, role:'teacher', label:'教师初审',  approver:'李明远', status:'rejected', comment:'技术方案过于简略，市场分析缺乏数据支撑，请补充完善后重新提交。', actedAt:'2026-06-03 09:00' },
        { step:2, role:'admin',   label:'管理员终审', approver:'刘志远', status:'waiting',  comment:'', actedAt:null },
      ], aiReviewId:3, prePlanId:3 },
  ];

  const awards = [
    { id:1, compId:4, compName:'字节跳动青年技术训练营', teamId:4, teamName:'破晓战队', leader:'赵磊', teacher:'王建国', rank:1, rankName:'一等奖', prize:'¥100,000', status:'teacher_confirm', nominatedAt:'2026-06-01' },
    { id:2, compId:4, compName:'字节跳动青年技术训练营', teamId:7, teamName:'光速编队',  leader:'林浩', teacher:'陈晓梅', rank:2, rankName:'二等奖', prize:'¥50,000',  status:'teacher_confirm', nominatedAt:'2026-06-01' },
    { id:3, compId:4, compName:'字节跳动青年技术训练营', teamId:8, teamName:'CodeStorm', leader:'吴婷', teacher:'王建国', rank:3, rankName:'三等奖', prize:'¥20,000',  status:'teacher_confirm', nominatedAt:'2026-06-01' },
    { id:4, compId:5, compName:'百度AI开发者创新马拉松', teamId:5, teamName:'StarDust',  leader:'孙浩', teacher:'陈晓梅', rank:1, rankName:'一等奖', prize:'¥80,000',  status:'settled', nominatedAt:'2026-05-15', settledAt:'2026-05-20' },
    { id:5, compId:5, compName:'百度AI开发者创新马拉松', teamId:1, teamName:'量子跃迁',  leader:'张明', teacher:'王建国', rank:2, rankName:'二等奖', prize:'¥40,000',  status:'settled', nominatedAt:'2026-05-15', settledAt:'2026-05-20' },
    { id:6, compId:5, compName:'百度AI开发者创新马拉松', teamId:9, teamName:'北极星',   leader:'黄磊', teacher:'李明远', rank:3, rankName:'三等奖', prize:'¥15,000',  status:'settled', nominatedAt:'2026-05-15', settledAt:'2026-05-20' },
  ];

  const evaluations = [
    { id:1, studentId:3, studentName:'张明', teacherId:2, teacherName:'王建国', compId:5, compName:'百度AI马拉松',
      ratings:{teaching:5,communication:4,availability:4,overall:5},
      feedback:'王老师在比赛期间给予了非常专业的技术指导，尤其在AI模型调优方面帮助很大。沟通及时响应迅速，非常感谢！',
      submittedAt:'2026-05-22', status:'submitted' },
    { id:2, studentId:4, studentName:'李云', teacherId:2, teacherName:'王建国', compId:1, compName:'华为ICT',
      ratings:null, feedback:'', submittedAt:null, status:'pending' },
    { id:3, studentId:9, studentName:'林浩', teacherId:10, teacherName:'陈晓梅', compId:5, compName:'百度AI马拉松',
      ratings:{teaching:4,communication:5,availability:5,overall:5},
      feedback:'陈老师特别有耐心，每次遇到困难都能及时帮助解决，指导时间充分，帮助我们拿到了一等奖！',
      submittedAt:'2026-05-23', status:'submitted' },
    { id:4, studentId:11, studentName:'吴婷', teacherId:2, teacherName:'王建国', compId:4, compName:'字节青年营',
      ratings:{teaching:5,communication:5,availability:4,overall:5},
      feedback:'老师对技术的深度理解令人印象深刻，指导非常有针对性，极大提升了我们的方案质量。',
      submittedAt:'2026-06-02', status:'submitted' },
  ];

  const teachers = [
    { id:2,  name:'王建国', avatar:'王', dept:'计算机科学学院', guided:5, winRate:60, avgRating:4.7, evalCount:8  },
    { id:10, name:'陈晓梅', avatar:'陈', dept:'人工智能学院',   guided:4, winRate:75, avgRating:4.9, evalCount:6  },
    { id:11, name:'李明远', avatar:'李', dept:'信息工程学院',   guided:3, winRate:33, avgRating:4.2, evalCount:4  },
  ];

  const notifications = [
    { id:1, type:'workflow',   title:'审批通知',    message:'您的报名申请「量子跃迁」已通过审批',                       read:false, at:'10分钟前' },
    { id:2, type:'ai_result',  title:'AI 审核完成', message:'「AI驱动的智慧校园服务平台」预计划审核完成，得分 78 分', read:false, at:'2小时前'  },
    { id:3, type:'evaluation', title:'评价提醒',    message:'请对指导教师王建国完成本次竞赛评价',                       read:true,  at:'昨天'     },
    { id:4, type:'award',      title:'获奖通知',    message:'恭喜！「量子跃迁」在百度AI马拉松荣获二等奖',             read:true,  at:'5月21日'  },
  ];

  const monthStats = [
    { m:'1月', comps:1, teams:8,  approvals:15, awards:2  },
    { m:'2月', comps:2, teams:18, approvals:32, awards:5  },
    { m:'3月', comps:1, teams:12, approvals:22, awards:4  },
    { m:'4月', comps:2, teams:25, approvals:45, awards:8  },
    { m:'5月', comps:1, teams:15, approvals:28, awards:6  },
    { m:'6月', comps:2, teams:20, approvals:36, awards:3  },
  ];

  return { users, competitions, teams, myTeamMembers, prePlans, aiReviews, approvals, awards, evaluations, teachers, notifications, monthStats };
})();

Object.assign(window, { mockData });

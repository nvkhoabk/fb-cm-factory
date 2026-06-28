export type HelpPageKey =
  | "dashboard"
  | "productionStudio"
  | "productionControl"
  | "characters"
  | "characterImport"
  | "characterGroups"
  | "assetCenter"
  | "promptTemplates"
  | "scripts"
  | "workflows"
  | "hosts"
  | "instances"
  | "capacityPools"
  | "runtimeSessions"
  | "productionResources"
  | "screenTemplates"
  | "errorCenter";

export type HelpPageContent = {
  title: string;
  purpose: string;
  whenToUse: string[];
  workflow: string[];
  tips: string[];
  relatedLinks: Array<{ label: string; target: HelpPageKey }>;
};

export type StepHelpContent = {
  label: string;
  description: string;
  warning: string;
  success: string;
};

export type ScriptStepHelp = {
  what: string;
  when: string;
  mistakes: string[];
};

export const helpContent: {
  pages: Record<HelpPageKey, HelpPageContent>;
  tooltips: Record<string, string>;
  emptyStates: Record<string, string>;
  productionStudioSteps: StepHelpContent[];
  scriptSteps: Record<string, ScriptStepHelp>;
} = {
  pages: {
    dashboard: {
      title: "Dashboard",
      purpose: "Theo dõi nhanh tình trạng factory, queue, runtime và các cảnh báo vận hành.",
      whenToUse: ["Khi bắt đầu ca vận hành.", "Khi cần xem tổng quan trước khi xử lý lỗi hoặc launch job."],
      workflow: ["Kiểm tra KPI chính.", "Mở các cảnh báo hoặc runtime bất thường.", "Đi tới màn hình liên quan để thao tác chi tiết."],
      tips: ["Dashboard chỉ là màn hình tổng quan, không thay thế các màn hình quản trị chi tiết."],
      relatedLinks: [{ label: "Production Control", target: "productionControl" }, { label: "Error Center", target: "errorCenter" }]
    },
    productionStudio: {
      title: "Production Studio",
      purpose: "Chuẩn bị và launch một lượt sản xuất từ Character Group, Workflow, Prompt, Script và Capacity.",
      whenToUse: ["Khi muốn tạo batch/job mới.", "Khi cần kiểm tra prompt, script và capacity trước khi chạy."],
      workflow: ["Chọn Character Group.", "Điền attributes.", "Chọn Workflow.", "Kiểm tra Prompt/Script.", "Kiểm tra Capacity.", "Launch Production."],
      tips: ["Group là đơn vị sản xuất. Ảnh gốc vẫn thuộc Character.", "Nếu thiếu STANDBY instance phù hợp, scheduler sẽ không cấp job."],
      relatedLinks: [{ label: "Character Groups", target: "characterGroups" }, { label: "Workflows", target: "workflows" }, { label: "Capacity Pools", target: "capacityPools" }]
    },
    productionControl: {
      title: "Production Control Center",
      purpose: "Theo dõi production group, job queue, allocation, runtime và output theo từng lượt sản xuất.",
      whenToUse: ["Sau khi launch production.", "Khi cần allocate, execute, retry hoặc inspect job."],
      workflow: ["Chọn production group.", "Kiểm tra tiến độ IMAGE_EDIT.", "Allocate/execute job.", "Mở drawer để xem lineage, runtime và output."],
      tips: ["IMAGE_EDIT thường có nhiều child job, mỗi source image một job.", "Retry nên dùng sau khi đọc lỗi runtime."],
      relatedLinks: [{ label: "Runtime Sessions", target: "runtimeSessions" }, { label: "Production Resources", target: "productionResources" }]
    },
    characters: {
      title: "Characters",
      purpose: "Quản lý nhân vật gốc, ảnh young/old và các quan hệ asset phát sinh.",
      whenToUse: ["Khi cần kiểm tra nguồn ảnh của từng nhân vật.", "Khi cần sửa metadata hoặc xem nhân vật thuộc group nào."],
      workflow: ["Import ảnh young/old.", "Mở Character để kiểm tra ảnh nguồn.", "Thêm Character vào Group nếu đã đủ ảnh."],
      tips: ["Character sở hữu ảnh gốc. Character Group chỉ tham chiếu Character để sản xuất."],
      relatedLinks: [{ label: "Character Import", target: "characterImport" }, { label: "Character Groups", target: "characterGroups" }]
    },
    characterImport: {
      title: "Character Import",
      purpose: "Upload cặp ảnh young/old và tạo Character nhanh.",
      whenToUse: ["Khi bắt đầu nhập dữ liệu nhân vật.", "Khi cần validate nhiều cặp ảnh trước khi import."],
      workflow: ["Chọn chế độ pair hoặc bulk.", "Upload ảnh.", "Preview Validate.", "Import Valid Pairs.", "Kiểm tra Character mới."],
      tips: ["Tên file nên đủ rõ để hệ thống ghép cặp chính xác.", "Luôn preview trước khi import bulk."],
      relatedLinks: [{ label: "Characters", target: "characters" }, { label: "Character Groups", target: "characterGroups" }]
    },
    characterGroups: {
      title: "Character Groups",
      purpose: "Tạo đơn vị sản xuất gồm nhiều Character và attributes dùng cho workflow.",
      whenToUse: ["Khi đã có Character đủ ảnh nguồn.", "Khi muốn chuẩn bị batch cho Production Studio."],
      workflow: ["Chọn Character.", "Tạo Group.", "Điền attributes.", "Kiểm tra readiness.", "Tạo production batch hoặc mở Studio."],
      tips: ["Group không chứa trực tiếp ảnh, chỉ chứa Character membership và attributes."],
      relatedLinks: [{ label: "Production Studio", target: "productionStudio" }, { label: "Characters", target: "characters" }]
    },
    assetCenter: {
      title: "Asset Center",
      purpose: "Duyệt thư viện asset hợp nhất: ảnh, prompt, music, video và output sản xuất.",
      whenToUse: ["Khi cần tìm lại asset.", "Khi cần xem lineage hoặc mở nguồn của asset."],
      workflow: ["Chọn tab asset.", "Lọc/tìm kiếm.", "Mở preview.", "Đi tới nguồn để chỉnh sửa nếu cần."],
      tips: ["Asset Center tổng hợp dữ liệu, không phải nơi tạo duplicate record."],
      relatedLinks: [{ label: "Production Resources", target: "productionResources" }, { label: "Prompt Templates", target: "promptTemplates" }]
    },
    promptTemplates: {
      title: "Prompt Templates",
      purpose: "Quản lý mẫu prompt dùng để render prompt thực tế khi chạy job.",
      whenToUse: ["Khi cần chỉnh prompt theo workflow.", "Khi muốn preview biến và version prompt."],
      workflow: ["Tạo template.", "Thêm version.", "Preview render.", "Gắn vào Workflow hoặc Studio."],
      tips: ["Không sửa prompt trực tiếp trong job nếu thay đổi cần tái sử dụng lâu dài."],
      relatedLinks: [{ label: "Workflows", target: "workflows" }, { label: "Production Studio", target: "productionStudio" }]
    },
    scripts: {
      title: "Scripts",
      purpose: "Thiết kế chuỗi thao tác automation trên app, Chrome hoặc LDPlayer.",
      whenToUse: ["Khi cần tạo/chỉnh robot thao tác.", "Khi cần test upload/download/check-screen."],
      workflow: ["Tạo script.", "Thêm version.", "Xây step sequence.", "Validate.", "Test Run.", "Activate version."],
      tips: ["clear-download nên chạy trước download-latest để tránh lấy nhầm file cũ.", "upload-file dùng thư mục staging, không dùng Android Download."],
      relatedLinks: [{ label: "Screen Templates", target: "screenTemplates" }, { label: "Runtime Sessions", target: "runtimeSessions" }]
    },
    workflows: {
      title: "Workflows",
      purpose: "Định nghĩa template sản xuất liên kết resource rules, prompt, script và capacity.",
      whenToUse: ["Khi cần tạo pipeline mới.", "Khi cần điều chỉnh mapping prompt/script/capacity."],
      workflow: ["Tạo workflow.", "Cấu hình resource rules.", "Map prompt/script.", "Đặt capacity.", "Launch thử từ Studio."],
      tips: ["Workflow nên mô tả quy trình ổn định, còn override tạm thời nên làm trong Studio."],
      relatedLinks: [{ label: "Production Studio", target: "productionStudio" }, { label: "Scripts", target: "scripts" }]
    },
    hosts: {
      title: "Hosts",
      purpose: "Quản lý máy chạy Host Agent và các LDPlayer/browser instances trên máy đó.",
      whenToUse: ["Khi thêm máy worker mới.", "Khi cần health check, sync instance hoặc map ADB."],
      workflow: ["Tạo Host.", "Health Check.", "Sync Instances.", "Kiểm tra ADB devices.", "Mở instance detail."],
      tips: ["Base URL của Host Agent là cấu hình vận hành riêng, không phải backend API chính."],
      relatedLinks: [{ label: "Instances", target: "instances" }, { label: "Capacity Pools", target: "capacityPools" }]
    },
    instances: {
      title: "Instances",
      purpose: "Quản lý từng worker LDPlayer/browser/app chạy trên Host.",
      whenToUse: ["Khi cần đổi trạng thái worker.", "Khi cần set capability hoặc test screenshot."],
      workflow: ["Sync từ Host.", "Map ADB.", "Set capability.", "Chuyển STANDBY khi sẵn sàng nhận job."],
      tips: ["Instance ở STANDBY và có capability phù hợp mới được scheduler cấp job."],
      relatedLinks: [{ label: "Capacity Pools", target: "capacityPools" }, { label: "Hosts", target: "hosts" }]
    },
    capacityPools: {
      title: "Capacity Pools",
      purpose: "Theo dõi năng lực worker theo trạng thái STANDBY, capability và allocation.",
      whenToUse: ["Trước khi launch production.", "Khi job pending vì thiếu worker."],
      workflow: ["Kiểm tra STANDBY.", "Set capability.", "Chọn instance.", "Theo dõi allocation hiện tại."],
      tips: ["Không đủ STANDBY capability IMAGE_EDIT sẽ làm IMAGE_EDIT job không chạy được."],
      relatedLinks: [{ label: "Instances", target: "instances" }, { label: "Production Studio", target: "productionStudio" }]
    },
    runtimeSessions: {
      title: "Runtime Sessions",
      purpose: "Theo dõi phiên chạy thực tế của script/job, checkpoint, step và lỗi recoverable.",
      whenToUse: ["Khi job đang chạy.", "Khi cần pause, recover hoặc xem step output."],
      workflow: ["Chọn session.", "Xem step list.", "Kiểm tra error/output.", "Recover hoặc mark unrecoverable nếu cần."],
      tips: ["Runtime failed recoverable có thể resume từ checkpoint nếu còn worker phù hợp."],
      relatedLinks: [{ label: "Scripts", target: "scripts" }, { label: "Error Center", target: "errorCenter" }]
    },
    productionResources: {
      title: "Production Resources",
      purpose: "Theo dõi các batch/resource sản xuất và lineage từ Character Group tới output.",
      whenToUse: ["Sau khi production tạo batch.", "Khi cần xem output, jobs, runtime liên quan."],
      workflow: ["Chọn resource.", "Xem overview.", "Mở lineage/jobs/runtime.", "Archive hoặc restore nếu cần."],
      tips: ["Resource READY nghĩa là sẵn sàng cho stage tiếp theo hoặc sử dụng lại theo policy."],
      relatedLinks: [{ label: "Production Control", target: "productionControl" }, { label: "Asset Center", target: "assetCenter" }]
    },
    screenTemplates: {
      title: "Screen Templates",
      purpose: "Lưu mẫu nhận diện màn hình để check-screen, wait-screen và recovery rule sử dụng.",
      whenToUse: ["Khi script cần đợi UI xuất hiện.", "Khi muốn tự động phân loại lỗi theo screenshot."],
      workflow: ["Tạo template.", "Chọn match type.", "Gắn ảnh/OCR text.", "Dùng trong script hoặc recovery rule."],
      tips: ["Threshold quá cao dễ fail, quá thấp dễ match nhầm."],
      relatedLinks: [{ label: "Scripts", target: "scripts" }, { label: "Error Center", target: "errorCenter" }]
    },
    errorCenter: {
      title: "Error Center",
      purpose: "Tập trung lỗi runtime/script để phân loại, tạo template và gắn recovery script.",
      whenToUse: ["Khi job fail.", "Khi cần tạo quy trình recovery từ lỗi lặp lại."],
      workflow: ["Mở error.", "Xem screenshot/runtime/script.", "Classify.", "Tạo Screen Template hoặc attach recovery.", "Resolve."],
      tips: ["Luôn kiểm tra screenshot trước khi đánh dấu lỗi recoverable."],
      relatedLinks: [{ label: "Runtime Sessions", target: "runtimeSessions" }, { label: "Screen Templates", target: "screenTemplates" }]
    }
  },
  tooltips: {
    character: "Character là nhân vật gốc, sở hữu ảnh young/old và các asset phát sinh.",
    characterGroup: "Group là đơn vị sản xuất. Group chứa Character, không chứa trực tiếp ảnh.",
    promptTemplate: "Prompt Template là mẫu prompt dùng để render prompt thực tế khi chạy job.",
    script: "Script là chuỗi thao tác automation trên app/Chrome/LDPlayer.",
    workflow: "Workflow là template sản xuất, liên kết resource rules, prompt, script và capacity.",
    host: "Host là máy tính chạy Host Agent và quản lý các LDPlayer instances.",
    instance: "Instance là một worker LDPlayer/browser/app chạy trên Host.",
    standby: "Chỉ instance ở STANDBY và có capability phù hợp mới được scheduler cấp job.",
    imageEdit: "IMAGE_EDIT tạo ảnh mới từ source image. Mỗi source image tạo một child job.",
    clearDownload: "Xóa file ảnh/video cũ trong Android Download để download-latest lấy đúng file mới.",
    downloadLatest: "Tìm file ảnh/video mới nhất trong Android Download và kéo về backend.",
    uploadFile: "Đẩy asset từ backend vào Android để chọn bằng Android File Picker."
  },
  emptyStates: {
    characters: "Chưa có Character. Hãy vào Character Import để upload cặp ảnh young/old.",
    characterGroups: "Chưa có Group. Tạo Group từ các Character đã import.",
    imageEditJobs: "Chưa có IMAGE_EDIT job. Hãy Launch Production từ Production Studio.",
    standbyInstances: "Chưa có instance sẵn sàng. Chuyển một instance sang STANDBY và tick capability IMAGE_EDIT.",
    scripts: "Chưa có Script phù hợp. Tạo script mới hoặc bỏ filter để xem toàn bộ.",
    runtimeSessions: "Chưa có Runtime Session. Hãy execute một job để tạo phiên chạy.",
    productionResources: "Chưa có resource phù hợp. Launch Production hoặc đổi bộ lọc.",
    screenTemplates: "Chưa có Screen Template. Tạo template từ Error Center hoặc thêm thủ công."
  },
  productionStudioSteps: [
    { label: "Chọn Character Group", description: "Chọn group đã có đủ Character và ảnh young/old.", warning: "Group thiếu ảnh sẽ tạo thiếu source job hoặc bị cảnh báo readiness.", success: "Group được chọn và số source image đúng kỳ vọng." },
    { label: "Chọn Attributes", description: "Điền scene, outfit, emotion hoặc attribute riêng cho lượt chạy.", warning: "Attribute trống có thể làm prompt render thiếu ngữ cảnh.", success: "Prompt preview hiển thị đúng thuộc tính cần dùng." },
    { label: "Chọn Workflow", description: "Chọn pipeline liên kết rules, prompt, script và capacity.", warning: "Workflow thiếu mapping có thể tạo job không có prompt/script.", success: "Workflow có đủ stage cần chạy." },
    { label: "Kiểm tra Prompt/Script", description: "Xem prompt preview và script mapping trước khi launch.", warning: "Prompt sai biến hoặc script sai step sẽ làm runtime fail.", success: "Prompt có nội dung rõ, script đúng category." },
    { label: "Kiểm tra Capacity", description: "So sánh nhu cầu stage với instance STANDBY có capability.", warning: "Thiếu STANDBY khiến job pending.", success: "Các stage chính hiển thị OK hoặc đã biết shortage." },
    { label: "Launch Production", description: "Tạo production resources và jobs từ cấu hình đã kiểm tra.", warning: "Sau launch nên mở Production Control để theo dõi.", success: "Có CHARACTER_GROUP/IMAGE_BATCH và job được tạo." }
  ],
  scriptSteps: {
    tap: { what: "Chạm một điểm trên màn hình.", when: "Dùng cho nút cố định hoặc tọa độ đã kiểm chứng.", mistakes: ["Tọa độ sai do khác độ phân giải.", "Không chờ màn hình sẵn sàng trước khi tap."] },
    swipe: { what: "Vuốt từ điểm A tới điểm B.", when: "Dùng để kéo danh sách, mở panel hoặc điều hướng UI.", mistakes: ["Duration quá ngắn.", "Vuốt khi màn hình chưa ổn định."] },
    "long-press": { what: "Nhấn giữ một điểm trong thời gian định sẵn.", when: "Dùng để mở menu ngữ cảnh hoặc chọn item.", mistakes: ["durationMs quá thấp.", "Không kiểm tra menu đã mở sau step."] },
    "scroll-to-end": { what: "Cuộn lặp tới cuối danh sách.", when: "Dùng trước khi tìm item nằm cuối trang.", mistakes: ["iterations quá ít.", "Cuộn sai hướng."] },
    "send-text": { what: "Gửi text qua ADB Keyboard.", when: "Dùng nhập prompt, caption hoặc search text.", mistakes: ["Quên clear field trước khi gửi.", "Text quá dài nhưng chưa chia chunk phù hợp."] },
    "send-text-submit": { what: "Gửi text rồi submit bằng phím cấu hình.", when: "Dùng cho ô chat/search cần Enter sau khi nhập.", mistakes: ["Submit sai key.", "Gửi khi focus chưa nằm trong input."] },
    "upload-file": { what: "Đẩy asset từ backend sang Android staging để chọn qua File Picker.", when: "Dùng trước bước app yêu cầu upload ảnh/video.", mistakes: ["Chưa chọn assetSource đúng.", "Dùng MANUAL_ASSET nhưng thiếu assetId."] },
    "clear-download": { what: "Xóa file cũ trong Android Download.", when: "Dùng trước khi app tải output mới xuống Download.", mistakes: ["Xóa sai thư mục.", "Bỏ qua step này khiến download-latest lấy nhầm file cũ."] },
    "download-latest": { what: "Tìm file ảnh/video mới nhất trong Android Download và kéo về backend.", when: "Chỉ chạy sau khi ảnh/video đã được tải vào Android Download.", mistakes: ["Chưa có file mới nên fail DOWNLOAD_OUTPUT_NOT_FOUND.", "extensions không bao gồm định dạng output."] },
    "check-screen": { what: "Kiểm tra màn hình hiện tại có match template không.", when: "Dùng để rẽ nhánh hoặc phân loại trạng thái UI.", mistakes: ["Template quá chung.", "Threshold không phù hợp."] },
    "wait-screen": { what: "Chờ tới khi màn hình match template.", when: "Dùng trước thao tác phụ thuộc UI mới.", mistakes: ["timeoutMs quá thấp.", "Không có fallback khi timeout."] },
    if: { what: "Rẽ nhánh theo condition.", when: "Dùng khi flow có nhiều trạng thái màn hình.", mistakes: ["Condition không có dữ liệu runtime.", "Then/else thiếu step an toàn."] },
    "run-sub-script": { what: "Gọi một script con.", when: "Dùng để tái sử dụng login, recovery hoặc upload flow.", mistakes: ["Script con không active.", "Không truyền context cần thiết."] }
  }
};

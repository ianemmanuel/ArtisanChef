import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/middleware/error"
import { listAuditLogs, getAuditLog } from "../services/admin.audit.service"

export const handleListAuditLogs: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { action, search, dateFrom, dateTo, page, pageSize } = req.query as {
      action?: string; search?: string; dateFrom?: string; dateTo?: string; page?: string; pageSize?: string
    }
    const result = await listAuditLogs(
      {
        action,
        search,
        // dateTo comes in as a bare "YYYY-MM-DD" from the date picker — parsed
        // as-is that's midnight UTC, which would exclude the rest of that day.
        // Push it to the end of the day so the range is inclusive.
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo  : dateTo   ? new Date(`${dateTo}T23:59:59.999`) : undefined,
        page    : page     ? parseInt(page)     : undefined,
        pageSize: pageSize ? parseInt(pageSize) : undefined,
      },
      adminScope,
    )
    return sendSuccess(res, result, "Audit logs fetched")
  } catch (err) { next(err) }
}

export const handleGetAuditLog: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const log = await getAuditLog(id, adminScope)
    if (!log) throw new ApiError(404, "Audit log entry not found", "AUDIT_LOG_NOT_FOUND")
    return sendSuccess(res, log, "Audit log fetched")
  } catch (err) { next(err) }
}

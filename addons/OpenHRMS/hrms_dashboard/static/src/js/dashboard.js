/** @odoo-module **/
import { registry } from "@web/core/registry";
import { session } from "@web/session";
import { _t } from "@web/core/l10n/translation";
import { onMounted, Component, useRef } from "@odoo/owl";
import { onWillStart, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { WebClient } from "@web/webclient/webclient";
import { user } from "@web/core/user";
const actionRegistry = registry.category("actions");
import { ActivityMenu } from "@hr_attendance/components/attendance_menu/attendance_menu";
import { patch } from "@web/core/utils/patch";
export class HrDashboard extends Component {
    static template = 'HrDashboardMain';
    static props = ["*"];

    setup() {
        this.effect = useService("effect");
        this.action = useService("action");
        this.orm = useService("orm");

        this.log_in_out = useRef("log_in_out");
        this.emp_graph = useRef("emp_graph");
        this.leave_graph = useRef("leave_graph");
        this.join_resign_trend = useRef("join_resign_trend");
        this.attrition_rate = useRef("attrition_rate");
        this.leave_trend = useRef("leave_trend");

        this.state = useState({
            is_manager: false,
            date_range: 'week',
            dashboards_templates: ['LoginEmployeeDetails', 'ManagerDashboard', 'EmployeeDashboard'],
            employee_birthday: [],
            upcoming_events: [],
            announcements: [],
            login_employee: [],
            templates: [],
        });

        onWillStart(async () => {
            this.isHrManager = await user.hasGroup("hr.group_hr_manager");
            this.state.is_manager = await this.orm.call('hr.employee', 'check_user_group', []);
            
            const empDetails = await this.orm.call('hr.employee', 'get_user_employee_details', []);
            if (empDetails) {
                this.state.login_employee = empDetails[0];
            }

            const res = await this.orm.call('hr.employee', 'get_upcoming', []);
            if (res) {
                this.state.employee_birthday = res['birthday'];
                this.state.upcoming_events = res['event'];
                this.state.announcements = res['announcement'];
            }
        });

        // ✅ Ensuring `renderGraphs()` runs after the DOM is fully loaded
        onMounted(() => {
            console.log("HrDashboard Mounted!");
            setTimeout(() => {
                console.log("Calling renderGraphs...");
                this.renderGraphs();
            }, 500); // Ensuring DOM elements exist
        });
    }

    renderGraphs() {
        console.log("Executing renderGraphs...");
        try {
            this.render_department_employee();
        } catch (error) {
            console.error("Error rendering department employee graph:", error);
        }

        try {
            this.render_leave_graph();
        } catch (error) {
            console.error("Error rendering leave graph:", error);
        }

        try {
            this.update_join_resign_trends();
        } catch (error) {
            console.error("Error updating join-resign trends:", error);
        }

        try {
            this.update_monthly_attrition();
        } catch (error) {
            console.error("Error updating monthly attrition:", error);
        }

        try {
            this.update_leave_trend();
        } catch (error) {
            console.error("Error updating leave trend:", error);
        }

        try {
            this.render_employee_skill();
        } catch (error) {
            console.error("Error rendering employee skill chart:", error);
        }
    }

    async render_department_employee() {
        const canvas = document.getElementById('employeePieChart');
        if (!canvas) {
            console.warn("Canvas element 'employeePieChart' not found. Skipping chart rendering.");
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Cannot get context for 'employeePieChart'.");
            return;
        }

        const data = await this.orm.call('hr.employee', 'get_dept_employee', []);
        if (data) {
            const labels = data.map(d => d.label);
            const values = data.map(d => d.value);

            new Chart(ctx, {
                type: 'pie',
                data: { labels, datasets: [{ data: values, backgroundColor: ['#70cac1', '#659d4e', '#208cc2'] }] },
                options: { responsive: true, plugins: { legend: { display: true, position: 'right' } } }
            });
        }
    }

    
    async render_department_employee() {
        const canvas = document.getElementById('employeePieChart');
        if (!canvas) {
            console.warn("Canvas element 'employeePieChart' not found. Skipping chart rendering.");
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Cannot get context for 'employeePieChart'.");
            return;
        }

        const colors = [
            '#70cac1', '#659d4e', '#208cc2', '#4d6cb1', '#584999',
            '#8e559e', '#cf3650', '#f65337', '#fe7139', '#ffa433',
            '#ffc25b', '#f8e54b'
        ];
        const data = await this.orm.call('hr.employee', 'get_dept_employee', []);
        if (data) {
            const labels = data.map(d => d.label);
            const values = data.map(d => d.value);

            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors,
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right',
                            labels: {
                                color: 'black',
                                usePointStyle: true,
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const percentage = (value / values.reduce((a, b) => a + b, 0) * 100).toFixed(2);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    async render_leave_graph() {
        // Ensure the DOM elements exist
        const barCanvas = document.getElementById('leave_barChart');
        const pieCanvas = document.getElementById('leave_doughnutChart');
    
        if (!barCanvas || !pieCanvas) {
            console.error("Error: leave_graph canvas elements not found.");
            return;
        }
    
        const barCtx = barCanvas.getContext('2d');
        const pieCtx = pieCanvas.getContext('2d');
    
        if (!barCtx || !pieCtx) {
            console.error("Error: Cannot getContext for leave graphs.");
            return;
        }
    
        // Fetch leave data
        const data = await this.orm.call('hr.employee', 'get_department_leave', []);
        
        if (data) {
            const fData = data[0];
            const dept = data[1];
            const barColor = '#ff618a';
    
            // Process leave data
            fData.forEach(d => {
                d.total = Object.values(dept).reduce((acc, dpt) => acc + (d.leave[dpt] || 0), 0);
            });
    
            const labels = fData.map(d => d.l_month);
            const barData = fData.map(d => d.total);
    
            // Bar Chart
            new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{ label: 'Total Leaves', data: barData, backgroundColor: barColor }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: context => `Total: ${context.raw}`
                            }
                        }
                    }
                }
            });
    
            // Doughnut Chart
            const pieData = dept.map(d => ({
                type: d,
                leave: fData.reduce((acc, t) => acc + (t.leave[d] || 0), 0)
            }));
    
            new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: pieData.map(d => d.type),
                    datasets: [{ data: pieData.map(d => d.leave), backgroundColor: ['#ffbf00', '#70cac1', '#659d4e'] }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: context => {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    return `${label}: ${value}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    async update_join_resign_trends() {
        const canvas = document.getElementById('lineChart');
        if (!canvas) {
            console.warn("Canvas element 'lineChart' not found. Skipping chart rendering.");
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Cannot get context for 'lineChart'.");
            return;
        }
    
        const colors = ['#70cac1', '#659d4e', '#208cc2', '#4d6cb1', '#584999', '#8e559e', '#cf3650', '#f65337', '#fe7139', '#ffa433', '#ffc25b', '#f8e54b'];
        const data = await this.orm.call('hr.employee', 'join_resign_trends', []);
    
        if (data) {
            const labels = data[0].values.map(d => d.l_month);
            const datasets = data.map((dataset, index) => ({
                label: dataset.name,
                data: dataset.values.map(d => d.count),
                borderColor: colors[index % colors.length],
                fill: false,
                tension: 0.1,
                borderWidth: 2
            }));
    
            new Chart(ctx, {
                type: 'line',
                data: { labels: labels, datasets: datasets },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, labels: { color: 'black' } }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Month' } },
                        y: { beginAtZero: true, title: { display: true, text: 'Count' } }
                    }
                }
            });
        }
    }
    
    async update_monthly_attrition() {
        const canvas = document.getElementById('attritionRateChart');
        if (!canvas) {
            console.warn("attritionRateChart element not found!");
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Cannot get context for attritionRateChart!");
            return;
        }
        
        const colors = ['#70cac1', '#659d4e', '#208cc2', '#4d6cb1'];
        const data = await this.orm.call('hr.employee', 'get_attrition_rate', []);
        
        if (data) {
            const labels = data.map(d => d.month);
            const attritionData = data.map(d => d.attrition_rate);
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Attrition Rate',
                        data: attritionData,
                        backgroundColor: colors[0],
                        borderColor: colors[0],
                        fill: false,
                        tension: 0.1,
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true, position: 'top' },
                    }
                }
            });
        }
    }
    
    async update_leave_trend() {
        const data = await this.orm.call('hr.employee', 'employee_leave_trend', []);
        if (data) {
            const labels = data.map(d => d.l_month);
            const leaveData = data.map(d => d.leave);
            const ctx = document.getElementById('leaveTrendChart').getContext('2d');
            const leaveTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Leaves Taken',
                        data: leaveData,
                        backgroundColor: 'rgba(70, 140, 193, 0.4)',
                        borderColor: 'rgba(70, 140, 193, 1)',
                        fill: true,
                        tension: 0.1,
                        pointRadius: 3,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return `Leaves: ${context.raw}`;
                                }
                            }
                        },
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: 'black'
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Leaves'
                            }
                        }
                    }
                }
            });
        }
    }
    async render_employee_skill() {
        const colors = ['#ff6384','#4bc0c0','#ffcd56','#c9cbcf','#36a2eb', '#659d4e', '#4d6cb1', '#584999', '#8e559e', '#cf3650', '#f65337', '#fe7139', '#ffa433', '#ffc25b', '#f8e54b'];
        const data = await this.orm.call('hr.employee', 'get_employee_skill', []);
        if (data) {
            const labels = data.map(d => d.skills);
            const skillData = data.map(d => d.progress);
            const ctx = document.getElementById('skillChart').getContext('2d');
            const skillChart = new Chart(ctx, {
                type: 'polarArea',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Skill ',
                        data: skillData,
                        backgroundColor: colors,
                        borderColor: ['white'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return `Skill: ${context.raw}`;
                                }
                            }
                        },
                        legend: {
                            display: true,
                            position: 'right',
                            labels: {
                                color: 'black'
                            }
                        }
                    },
                   scales: {
                    r: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
            });
        }
    }
    // EVENT METHODS
    add_attendance() {
        this.action.doAction({
            name: _t("Attendances"),
            type: 'ir.actions.act_window',
            res_model: 'hr.attendance',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'new'
        });
    }
    add_leave() {
        this.action.doAction({
            name: _t("Leave Request"),
            type: 'ir.actions.act_window',
            res_model: 'hr.leave',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'new'
        });
    }
    add_leave() {
        this.action.doAction({
            name: _t("Leave Request"),
            type: 'ir.actions.act_window',
            res_model: 'hr.leave',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'new'
        });
    }
    add_expense() {
        this.action.doAction({
            name: _t("Expense"),
            type: 'ir.actions.act_window',
            res_model: 'hr.expense',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'new'
        });
    }
    leaves_to_approve() {
        this.action.doAction({
            name: _t("Leave Request"),
            type: 'ir.actions.act_window',
            res_model: 'hr.leave',
            view_mode: 'tree,form,calendar',
            views: [[false, 'list'],[false, 'form']],
            domain: [['state','in',['confirm','validate1']]],
            target: 'current'
        });
    }
    leave_allocations_to_approve() {
        this.action.doAction({
            name: _t("Leave Allocation Request"),
            type: 'ir.actions.act_window',
            res_model: 'hr.leave.allocation',
            view_mode: 'tree,form,calendar',
            views: [[false, 'list'],[false, 'form']],
            domain: [['state','in',['confirm', 'validate1']]],
            target: 'current'
        })
    }
    job_applications_to_approve(){
        this.action.doAction({
            name: _t("Applications"),
            type: 'ir.actions.act_window',
            res_model: 'hr.applicant',
            view_mode: 'tree,kanban,form,pivot,graph,calendar',
            views: [[false, 'list'],[false, 'kanban'],[false, 'form'],
                    [false, 'pivot'],[false, 'graph'],[false, 'calendar']],
            context: {},
            target: 'current'
        })
    }
    leaves_request_today() {
        var date = new Date();
        this.action.doAction({
            name: _t("Leaves Today"),
            type: 'ir.actions.act_window',
            res_model: 'hr.leave',
            view_mode: 'tree,form,calendar',
            views: [[false, 'list'],[false, 'form']],
            domain: [['date_from','<=', date], ['date_to', '>=', date], ['state','=','validate']],
            target: 'current'
        })
    }
    leaves_request_month() {
        var date = new Date();
        var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        var fday = firstDay.toJSON().slice(0,10).replace(/-/g,'-');
        var lday = lastDay.toJSON().slice(0,10).replace(/-/g,'-');
        this.action.doAction({
            name: _t("This Month Leaves"),
            type: 'ir.actions.act_window',
            res_model: 'hr.leave',
            view_mode: 'tree,form,calendar',
            views: [[false, 'list'],[false, 'form']],
            domain: [['date_from','>', fday],['state','=','validate'],['date_from','<', lday]],
            target: 'current'
        })
    }
    hr_payslip() {
        this.action.doAction({
            name: _t("Employee Payslips"),
            type: 'ir.actions.act_window',
            res_model: 'hr.payslip',
            view_mode: 'tree,form,calendar',
            views: [[false, 'list'],[false, 'form']],
            domain: [['employee_id','=', this.state.login_employee.id]],
            target: 'current'
        });
    }
    async hr_contract() {
        if(this.isHrManager){
            this.action.doAction({
                name: _t("Contracts"),
                type: 'ir.actions.act_window',
                res_model: 'hr.contract',
                view_mode: 'tree,form,calendar',
                views: [[false, 'list'],[false, 'form']],
                context: {
                    'search_default_employee_id': this.state.login_employee.id,
                },
                target: 'current'
            })
        }
    }
    hr_timesheets() {
        this.action.doAction({
            name: _t("Timesheets"),
            type: 'ir.actions.act_window',
            res_model: 'account.analytic.line',
            view_mode: 'tree,form',
            views: [[false, 'list'], [false, 'form']],
            context: {
                'search_default_month': true,
            },
            domain: [['employee_id','=', this.state.login_employee.id]],
            target: 'current'
        })
    }
    employee_broad_factor() {
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0');
        var yyyy = today.getFullYear();
        this.action.doAction({
            name: _t("Leave Request"),
            type: 'ir.actions.act_window',
            res_model: 'hr.leave',
            view_mode: 'tree,form,calendar',
            views: [[false, 'list'],[false, 'form']],
            domain: [['state','in',['validate']],['employee_id','=', this.state.login_employee.id],['date_to','<=',today]],
            target: 'current',
            context:{'order':'duration_display'}
        })
    }
     attendance_sign_in_out() {
        if (this.state.login_employee['attendance_state'] == 'checked_out') {
            this.state.login_employee['attendance_state'] = 'checked_in'
        }
        else{
            if (this.state.login_employee['attendance_state'] == 'checked_in') {
                this.state.login_employee['attendance_state'] = 'checked_out'
            }
        }
        this.update_attendance()
    }
    async update_attendance() {
        var self = this;
        var result = await this.orm.call('hr.employee', 'attendance_manual',[[this.state.login_employee.id]])
        if (result) {
            var attendance_state = this.state.login_employee.attendance_state;
            var message = ''
            if (attendance_state == 'checked_in'){
                message = 'Checked In'
                this.env.bus.trigger('signin_signout', {
                    mode: "checked_in",
                });
            }
            else if (attendance_state == 'checked_out'){
                message = 'Checked Out'
                this.env.bus.trigger('signin_signout', {
                    mode: false,
                });
            }
            this.effect.add({
                message: _t("Successfully " + message),
                type: 'rainbow_man',
                fadeout: "fast",
            })
        }
    }
}
registry.category("actions").add("hr_dashboard", HrDashboard)

patch(ActivityMenu.prototype, {
    setup() {
        super.setup();
        onMounted(() => {
            console.log("ActivityMenu Mounted!");

            // Ensuring DOM elements exist before rendering graphs
            setTimeout(() => {
                console.log("Calling renderGraphs from ActivityMenu...");
                if (typeof this.renderGraphs === 'function') {
                    this.renderGraphs();
                } else {
                    console.error("Error: renderGraphs is not defined in ActivityMenu.");
                }
            }, 500);
        });
    },
});
